export type UserRole = 'author' | 'reader' | 'admin'
export type SubscriptionTier = 'free' | 'basic' | 'pro'
export type TrailerStatus = 'pending' | 'processing' | 'review' | 'generating' | 'complete' | 'failed'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  subscription_tier: SubscriptionTier
  subscription_status: 'active' | 'canceled' | 'past_due' | null
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  author_id: string
  title: string
  description: string | null
  genre: string | null
  amazon_link: string | null
  store_link: string | null
  pdf_url: string | null
  cover_image_url: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Character {
  id: string
  book_id: string
  name: string
  role: string | null
  description: string | null
  appearance_notes: string | null
  image_url: string | null
  author_approved: boolean
  created_at: string
}

export interface Scene {
  id: string
  book_id: string
  scene_number: number
  title: string | null
  description: string
  screenplay_text: string | null
  video_clip_url: string | null
  duration_seconds: number | null
  author_approved: boolean
  created_at: string
}

export interface Trailer {
  id: string
  book_id: string
  status: TrailerStatus
  quality_tier: 'basic' | 'pro'
  final_video_url: string | null
  thumbnail_url: string | null
  duration_seconds: number | null
  view_count: number
  click_count: number
  processing_started_at: string | null
  processing_completed_at: string | null
  created_at: string
  updated_at: string
}
