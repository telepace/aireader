export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          avatar_url: string | null
          provider: string | null
          provider_id: string | null
          is_anonymous: boolean
          anonymous_token: string | null
          preferences: Record<string, any> | null
          created_at: string
          updated_at: string
          last_active_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          provider?: string | null
          provider_id?: string | null
          is_anonymous?: boolean
          anonymous_token?: string | null
          preferences?: Record<string, any> | null
          created_at?: string
          updated_at?: string
          last_active_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          provider?: string | null
          provider_id?: string | null
          is_anonymous?: boolean
          anonymous_token?: string | null
          preferences?: Record<string, any> | null
          created_at?: string
          updated_at?: string
          last_active_at?: string
        }
      }
      prompt_tests: {
        Row: {
          id: string
          user_id: string
          prompt_object: string
          prompt_text: string
          prompt_result: string | null
          model_name: string
          response_time_ms: number | null
          token_count: number | null
          cost_estimate: number | null
          tags: string[] | null
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt_object: string
          prompt_text: string
          prompt_result?: string | null
          model_name: string
          response_time_ms?: number | null
          token_count?: number | null
          cost_estimate?: number | null
          tags?: string[] | null
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt_object?: string
          prompt_text?: string
          prompt_result?: string | null
          model_name?: string
          response_time_ms?: number | null
          token_count?: number | null
          cost_estimate?: number | null
          tags?: string[] | null
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          model_name: string | null
          message_count: number
          total_tokens: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          model_name?: string | null
          message_count?: number
          total_tokens?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          model_name?: string | null
          message_count?: number
          total_tokens?: number
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          token_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          token_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          token_count?: number | null
          created_at?: string
        }
      }
      conversation_options: {
        Row: {
          id: string
          conversation_id: string
          type: 'deepen' | 'next' | null
          content: string
          description: string | null
          click_count: number
          last_message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          type?: 'deepen' | 'next' | null
          content: string
          description?: string | null
          click_count?: number
          last_message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          type?: 'deepen' | 'next' | null
          content?: string
          description?: string | null
          click_count?: number
          last_message_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// 便利类型
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type PromptTest = Database['public']['Tables']['prompt_tests']['Row']
export type PromptTestInsert = Database['public']['Tables']['prompt_tests']['Insert']
export type PromptTestUpdate = Database['public']['Tables']['prompt_tests']['Update']

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type ConversationOption = Database['public']['Tables']['conversation_options']['Row']
export type ConversationOptionInsert = Database['public']['Tables']['conversation_options']['Insert']
export type ConversationOptionUpdate = Database['public']['Tables']['conversation_options']['Update']