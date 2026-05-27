// ============================================================
// Database Types for PhotoHub
// ============================================================

export type UserRole = 'admin' | 'leader' | 'camera_holder' | 'participant' | 'guest'

export type EventType = 'workshop' | 'competition' | 'meetup' | 'photowalk' | 'exhibition' | 'webinar' | 'other'

export type EventVisibility = 'public' | 'members_only' | 'invite_only'

export type SubmissionMode = 'image' | 'text' | 'link' | 'drive_link'

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'winner'

export type PostStatus = 'pending' | 'approved' | 'rejected' | 'featured'

export type ApexStatus = 'pending' | 'approved' | 'assigned' | 'ongoing' | 'completed' | 'delivered' | 'rejected'

export type ApexRole = 'photographer' | 'videographer' | 'editor'

export type AssignmentStatus = 'pending' | 'accepted' | 'rejected'

export type EquipmentStatus = 'available' | 'assigned' | 'maintenance' | 'retired'

export type EquipmentType = 'camera' | 'lens' | 'tripod' | 'lighting' | 'drone' | 'other'

export type CoverageType = 'photography' | 'videography' | 'both'

export type IgQueueStatus = 'pending' | 'shortlisted' | 'scheduled' | 'posted' | 'archived'

export type NotificationType = 'info' | 'success' | 'warning' | 'assignment' | 'approval' | 'rejection'

export type PointSource = 'event_attendance' | 'submission_approved' | 'challenge_win' | 'apex_completed' | 'post_approved' | 'post_featured' | 'manual' | 'consistency_bonus'

// ============================================================
// Table Types
// ============================================================

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  batch: string | null
  department: string | null
  skills: string[] | null
  bio: string | null
  phone: string | null
  is_active: boolean
  deactivated_at: string | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  banner_url: string | null
  event_type: EventType
  venue: string | null
  start_date: string
  end_date: string
  registration_deadline: string | null
  max_participants: number | null
  points: number
  visibility: EventVisibility
  submission_required: boolean
  submission_mode: SubmissionMode | null
  created_by: string | null
  is_published: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Computed / joined fields
  registration_count?: number
  is_registered?: boolean
}

export interface EventRegistration {
  id: string
  event_id: string
  user_id: string
  status: string
  attended: boolean
  checked_in_at: string | null
  checked_out_at: string | null
  registered_at: string
  // Joined
  profiles?: Profile
  events?: Event
}

export interface Submission {
  id: string
  user_id: string
  submittable_type: 'event' | 'challenge' | 'apex'
  submittable_id: string
  content_type: SubmissionMode
  content_url: string | null
  caption: string | null
  external_link: string | null
  status: SubmissionStatus
  score: number | null
  feedback: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: Profile
}

export interface Post {
  id: string
  user_id: string
  caption: string | null
  status: PostStatus
  is_featured: boolean
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  like_count: number
  comment_count: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: Profile
  post_media?: PostMedia[]
  user_has_liked?: boolean
}

export interface PostMedia {
  id: string
  post_id: string
  media_type: 'image' | 'video'
  url: string
  thumbnail_url: string | null
  cloudinary_public_id: string | null
  width: number | null
  height: number | null
  sort_order: number
  created_at: string
}

export interface Like {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: Profile
  replies?: Comment[]
}

export interface ApexRequest {
  id: string
  event_name: string
  organizer_name: string
  department: string | null
  contact_email: string
  contact_phone: string | null
  venue: string | null
  event_date: string
  event_time: string | null
  end_time: string | null
  coverage_type: CoverageType
  notes: string | null
  status: ApexStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  completed_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
  // Joined
  apex_assignments?: ApexAssignment[]
  apex_media?: ApexMedia[]
}

export interface ApexAssignment {
  id: string
  request_id: string
  user_id: string
  role: ApexRole
  status: AssignmentStatus
  equipment_id: string | null
  created_at: string
  // Joined
  profiles?: Profile
  equipment?: Equipment
  apex_attendance?: ApexAttendance[]
}

export interface ApexAttendance {
  id: string
  assignment_id: string
  checked_in_at: string | null
  checked_out_at: string | null
  hours_logged: number | null
  created_at: string
}

export interface ApexMedia {
  id: string
  request_id: string
  uploaded_by: string
  url: string
  thumbnail_url: string | null
  media_type: 'image' | 'video'
  cloudinary_public_id: string | null
  created_at: string
  // Joined
  profiles?: Profile
}

export interface Challenge {
  id: string
  title: string
  description: string | null
  theme: string | null
  banner_url: string | null
  start_date: string
  end_date: string
  points: number
  submission_mode: SubmissionMode
  max_submissions_per_user: number
  created_by: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Computed
  submission_count?: number
  user_submission_count?: number
}

export interface Equipment {
  id: string
  name: string
  type: EquipmentType
  model: string | null
  serial_number: string | null
  status: EquipmentStatus
  condition: string
  notes: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface EquipmentAssignment {
  id: string
  equipment_id: string
  assigned_to: string
  assigned_by: string | null
  event_id: string | null
  apex_request_id: string | null
  checked_out_at: string
  expected_return: string | null
  returned_at: string | null
  condition_on_return: string | null
  notes: string | null
  created_at: string
  // Joined
  equipment?: Equipment
  profiles?: Profile
}

export interface PointsLog {
  id: string
  user_id: string
  points: number
  reason: string
  source_type: PointSource
  source_id: string | null
  awarded_by: string | null
  created_at: string
}

export interface LeaderboardEntry {
  user_id: string
  total_points: number
  monthly_points: number
  semester_points: number
  event_count: number
  submission_count: number
  rank: number
  updated_at: string
  // Joined
  profiles?: Profile
}

export interface Announcement {
  id: string
  title: string
  content: string
  is_pinned: boolean
  priority: number
  expires_at: string | null
  created_by: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Joined
  profiles?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string | null
  type: NotificationType
  source_type: string | null
  source_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface InstagramQueueItem {
  id: string
  post_id: string
  caption: string | null
  status: IgQueueStatus
  scheduled_for: string | null
  posted_at: string | null
  managed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  posts?: Post & { post_media?: PostMedia[] }
  profiles?: Profile
}
