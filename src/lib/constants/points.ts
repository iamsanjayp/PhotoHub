import { type PointSource } from '@/types/database'

export const POINT_VALUES: Record<PointSource, number> = {
  event_attendance: 10,
  submission_approved: 15,
  challenge_win: 50,
  apex_completed: 25,
  post_approved: 5,
  post_featured: 20,
  manual: 0, // Variable, set by admin
  consistency_bonus: 10,
}

export const POINT_LABELS: Record<PointSource, string> = {
  event_attendance: 'Event Attendance',
  submission_approved: 'Submission Approved',
  challenge_win: 'Challenge Win',
  apex_completed: 'Apex Assignment Completed',
  post_approved: 'Post Approved',
  post_featured: 'Post Featured',
  manual: 'Manual Award',
  consistency_bonus: 'Consistency Bonus',
}
