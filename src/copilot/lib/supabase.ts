import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          company?: string;
          title?: string;
          status: string;
          priority: string;
          lead_score: number;
          value?: number;
          tags: string[];
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
      };
      calls: {
        Row: {
          id: string;
          contact_id: string;
          agent_id: string;
          start_time: string;
          end_time?: string;
          duration?: number;
          status: string;
          call_type: string;
          outcome?: string;
          notes?: string;
          recording_url?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['calls']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['calls']['Insert']>;
      };
      transcripts: {
        Row: {
          id: string;
          call_id: string;
          participant_id: string;
          text: string;
          timestamp: string;
          confidence: number;
          sentiment: string;
          emotion?: string;
        };
        Insert: Omit<Database['public']['Tables']['transcripts']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['transcripts']['Insert']>;
      };
      call_metrics: {
        Row: {
          id: string;
          call_id: string;
          clarity: number;
          empathy: number;
          assertiveness: number;
          efficiency: number;
          overall_score: number;
          personality_type?: string;
          personality_confidence?: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['call_metrics']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['call_metrics']['Insert']>;
      };
    };
  };
}
