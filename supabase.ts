import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client (uses service role — only in API routes / server components)
export function createServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          github_login: string | null
          github_id: number | null
          github_repos: number | null
          github_followers: number | null
          stripe_link: string | null
          trust_score: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'trust_score'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      products: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          category: string
          price: number
          stripe_link: string | null
          thumbnail_url: string | null
          file_url: string | null
          tags: string[]
          sales: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'sales' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
    }
  }
}
