'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/actions/auth'
import { deleteFromGoogleDrive } from '@/lib/google-drive'
import { promises as fs } from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'

export interface BatchStat {
  batch: string
  memberCount: number
  postCount: number
  postMediaCount: number
  submissionCount: number
  apexMediaCount: number
  totalMediaFiles: number
}

async function deleteLocalFile(filename: string): Promise<boolean> {
  const cleanFilename = path.basename(filename)
  let deleted = false

  const pathsToTry = [
    path.join(process.cwd(), 'public', 'uploads', cleanFilename),
    path.join(process.cwd(), 'storage', 'uploads', cleanFilename),
  ]

  for (const p of pathsToTry) {
    try {
      await fs.unlink(p)
      deleted = true
    } catch {
      // file might not exist at this path
    }
  }

  return deleted
}

/**
 * Extracts the fileId from a PhotoHub media URL (/api/media/<fileId>)
 */
function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/api\/media\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * Extracts the local filename from a local upload URL (/uploads/<filename>)
 */
function extractLocalFilename(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/uploads\/(.+)/)
  return match ? match[1] : null
}

/**
 * Computes live storage overview broken down by student batch.
 */
export async function getBatchStorageOverview(): Promise<{
  success?: boolean
  batches?: BatchStat[]
  error?: string
}> {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'board_member', 'leader'].includes(profile.role)) {
      return { error: 'Unauthorized: Admin access required.' }
    }

    const adminClient = await createAdminClient()

    // 1. Fetch all profiles with their batch and roll_number
    const { data: profiles, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, batch, roll_number')

    if (profileErr) throw profileErr

    // Infer or normalize batch:
    // If batch field is filled (e.g. "2024"), use it.
    // If empty but roll number matches 7376XX... (e.g. 7376241CS101 -> 2024), infer from roll number.
    const memberBatchMap = new Map<string, string>() // memberId -> batch
    const allBatches = new Set<string>()

    profiles?.forEach((p) => {
      let b = (p.batch || '').trim()
      if (!b && p.roll_number) {
        const roll = p.roll_number.trim().toUpperCase()
        const rollMatch = roll.match(/^7376(\d{2})/)
        if (rollMatch) {
          b = `20${rollMatch[1]}`
        }
      }
      if (!b) {
        b = 'Unassigned'
      }
      memberBatchMap.set(p.id, b)
      allBatches.add(b)
    })

    // 2. Fetch posts by author
    const { data: posts } = await adminClient
      .from('posts')
      .select('id, author_id')

    const postAuthorMap = new Map<string, string>() // postId -> authorId
    posts?.forEach((post) => {
      postAuthorMap.set(post.id, post.author_id)
    })

    // 3. Fetch post media
    const { data: postMedia } = await adminClient
      .from('post_media')
      .select('id, post_id, url')

    // 4. Fetch submissions
    const { data: submissions } = await adminClient
      .from('submissions')
      .select('id, user_id, content_url')

    // 5. Fetch apex media
    const { data: apexMedia } = await adminClient
      .from('apex_media')
      .select('id, uploaded_by, url')

    // Aggregate statistics per batch
    const statsMap = new Map<string, BatchStat>()

    allBatches.forEach((b) => {
      statsMap.set(b, {
        batch: b,
        memberCount: 0,
        postCount: 0,
        postMediaCount: 0,
        submissionCount: 0,
        apexMediaCount: 0,
        totalMediaFiles: 0,
      })
    })

    // Count members
    memberBatchMap.forEach((batch) => {
      const s = statsMap.get(batch)
      if (s) s.memberCount += 1
    })

    // Count posts
    posts?.forEach((post) => {
      const b = memberBatchMap.get(post.author_id) || 'Unassigned'
      const s = statsMap.get(b)
      if (s) s.postCount += 1
    })

    // Count post media
    postMedia?.forEach((pm) => {
      const authorId = postAuthorMap.get(pm.post_id)
      const b = authorId ? (memberBatchMap.get(authorId) || 'Unassigned') : 'Unassigned'
      const s = statsMap.get(b)
      if (s) {
        s.postMediaCount += 1
        s.totalMediaFiles += 1
      }
    })

    // Count submissions
    submissions?.forEach((sub) => {
      const b = memberBatchMap.get(sub.user_id) || 'Unassigned'
      const s = statsMap.get(b)
      if (s) {
        s.submissionCount += 1
        if (sub.content_url) s.totalMediaFiles += 1
      }
    })

    // Count apex media
    apexMedia?.forEach((am) => {
      const b = memberBatchMap.get(am.uploaded_by) || 'Unassigned'
      const s = statsMap.get(b)
      if (s) {
        s.apexMediaCount += 1
        if (am.url) s.totalMediaFiles += 1
      }
    })

    // Sort batches numerically descending (e.g. 2026, 2025, 2024, ..., Unassigned)
    const sortedBatches = Array.from(statsMap.values()).sort((a, b) => {
      if (a.batch === 'Unassigned') return 1
      if (b.batch === 'Unassigned') return -1
      return b.batch.localeCompare(a.batch)
    })

    return { success: true, batches: sortedBatches }
  } catch (error: any) {
    console.error('Error in getBatchStorageOverview:', error)
    return { error: error.message || 'Failed to fetch batch storage statistics' }
  }
}

/**
 * Prunes storage files and/or database records for all members belonging to a specific batch.
 */
export async function cleanupBatchStorage(input: {
  batch: string
  mode: 'media_only' | 'delete_all'
  deleteAccounts?: boolean
}): Promise<{
  success?: boolean
  error?: string
  filesDeletedDrive?: number
  filesDeletedLocal?: number
  recordsCleared?: number
  membersAffected?: number
}> {
  try {
    const profile = await getCurrentProfile()
    if (!profile || !['admin', 'board_member', 'leader'].includes(profile.role)) {
      return { error: 'Unauthorized: Admin privileges required.' }
    }

    const { batch, mode, deleteAccounts } = input
    if (!batch) {
      return { error: 'Batch identifier is required.' }
    }

    const adminClient = await createAdminClient()

    // 1. Identify all member IDs belonging to this batch
    const { data: allProfiles, error: profErr } = await adminClient
      .from('profiles')
      .select('id, batch, roll_number')

    if (profErr) throw profErr

    const targetMemberIds: string[] = []
    allProfiles?.forEach((p) => {
      let b = (p.batch || '').trim()
      if (!b && p.roll_number) {
        const rollMatch = p.roll_number.trim().toUpperCase().match(/^7376(\d{2})/)
        if (rollMatch) {
          b = `20${rollMatch[1]}`
        }
      }
      if (!b) b = 'Unassigned'

      if (b.toLowerCase() === batch.toLowerCase()) {
        targetMemberIds.push(p.id)
      }
    })

    if (targetMemberIds.length === 0) {
      return {
        success: true,
        filesDeletedDrive: 0,
        filesDeletedLocal: 0,
        recordsCleared: 0,
        membersAffected: 0,
      }
    }

    let filesDeletedDrive = 0
    let filesDeletedLocal = 0
    let recordsCleared = 0

    // 2. Collect post media for posts authored by these members
    const { data: posts } = await adminClient
      .from('posts')
      .select('id')
      .in('author_id', targetMemberIds)

    const postIds = posts?.map((p) => p.id) || []

    let postMediaUrls: string[] = []
    if (postIds.length > 0) {
      const { data: pmList } = await adminClient
        .from('post_media')
        .select('id, url')
        .in('post_id', postIds)

      pmList?.forEach((pm) => {
        if (pm.url) postMediaUrls.push(pm.url)
      })
    }

    // 3. Collect submission media
    const { data: subs } = await adminClient
      .from('submissions')
      .select('id, content_url')
      .in('user_id', targetMemberIds)

    const submissionMediaUrls: string[] = []
    subs?.forEach((s) => {
      if (s.content_url) submissionMediaUrls.push(s.content_url)
    })

    // 4. Collect apex media
    const { data: apexMedia } = await adminClient
      .from('apex_media')
      .select('id, url')
      .in('uploaded_by', targetMemberIds)

    const apexMediaUrls: string[] = []
    apexMedia?.forEach((am) => {
      if (am.url) apexMediaUrls.push(am.url)
    })

    // Combine all unique media URLs to delete from storage
    const allMediaUrls = Array.from(new Set([...postMediaUrls, ...submissionMediaUrls, ...apexMediaUrls]))

    // 5. Delete from Google Drive and Local Disk
    for (const url of allMediaUrls) {
      const driveFileId = extractDriveFileId(url)
      if (driveFileId) {
        const deleted = await deleteFromGoogleDrive(driveFileId)
        if (deleted) filesDeletedDrive++
        continue
      }

      const localFilename = extractLocalFilename(url)
      if (localFilename) {
        const deleted = await deleteLocalFile(localFilename)
        if (deleted) filesDeletedLocal++
        continue
      }
    }

    // 6. Database record cleanup
    if (mode === 'media_only') {
      // Remove post media rows
      if (postIds.length > 0) {
        const { error: pmDelErr } = await adminClient
          .from('post_media')
          .delete()
          .in('post_id', postIds)
        if (!pmDelErr) recordsCleared += postMediaUrls.length
      }

      // Clear or delete submission content URLs
      if (subs && subs.length > 0) {
        const subIds = subs.map((s) => s.id)
        const { error: subDelErr } = await adminClient
          .from('submissions')
          .delete()
          .in('id', subIds)
        if (!subDelErr) recordsCleared += subIds.length
      }

      // Delete apex media rows
      if (apexMedia && apexMedia.length > 0) {
        const amIds = apexMedia.map((a) => a.id)
        const { error: amDelErr } = await adminClient
          .from('apex_media')
          .delete()
          .in('id', amIds)
        if (!amDelErr) recordsCleared += amIds.length
      }
    } else if (mode === 'delete_all') {
      // Full Purge: delete posts, submissions, apex media
      if (postIds.length > 0) {
        const { error: postDelErr } = await adminClient
          .from('posts')
          .delete()
          .in('id', postIds)
        if (!postDelErr) recordsCleared += postIds.length
      }

      if (subs && subs.length > 0) {
        const subIds = subs.map((s) => s.id)
        await adminClient.from('submissions').delete().in('id', subIds)
        recordsCleared += subIds.length
      }

      if (apexMedia && apexMedia.length > 0) {
        const amIds = apexMedia.map((a) => a.id)
        await adminClient.from('apex_media').delete().in('id', amIds)
        recordsCleared += amIds.length
      }

      // If requested, purge the member accounts themselves (from auth.users with cascade to profiles)
      if (deleteAccounts) {
        for (const uid of targetMemberIds) {
          try {
            await adminClient.auth.admin.deleteUser(uid)
            recordsCleared++
          } catch (delUserErr) {
            console.warn(`Could not delete auth user ${uid}:`, delUserErr)
          }
        }
      }
    }

    revalidatePath('/admin/members')
    revalidatePath('/feed')
    revalidatePath('/challenges')

    return {
      success: true,
      filesDeletedDrive,
      filesDeletedLocal,
      recordsCleared,
      membersAffected: targetMemberIds.length,
    }
  } catch (error: any) {
    console.error('Error in cleanupBatchStorage:', error)
    return { error: error.message || 'Failed to cleanup batch storage' }
  }
}
