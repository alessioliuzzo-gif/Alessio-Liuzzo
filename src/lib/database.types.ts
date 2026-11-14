/**
 * Typen der Datenbank, von Hand passend zu supabase/migrations gepflegt.
 * Sobald das Supabase-Projekt steht, lässt sich diese Datei auch erzeugen:
 * npx supabase gen types typescript --project-id <id>
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PhotoVisibility = 'friends' | 'public';

export type ReportTarget = 'photo' | 'profile' | 'message' | 'comment';
export type ReportReason = 'spam' | 'harassment' | 'nudity' | 'violence' | 'hate' | 'other';

export type Database = {
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string;
          value: Json;
          is_public: boolean;
          description: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { username?: string; display_name?: string; avatar_path?: string | null };
        Relationships: [];
      };
      profile_private: {
        Row: { id: string; birth_year: number; terms_version: string; terms_accepted_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      daily_photos: {
        Row: {
          id: string;
          user_id: string;
          day: string;
          storage_path: string;
          visibility: PhotoVisibility;
          created_at: string;
          updated_at: string;
        };
        Insert: { day: string; storage_path: string; visibility?: PhotoVisibility };
        Update: { visibility?: PhotoVisibility };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted';
          created_at: string;
        };
        Insert: { addressee_id: string };
        Update: { status?: 'accepted' };
        Relationships: [];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocked_id: string };
        Update: never;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          photo_id: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: { recipient_id: string; body: string; photo_id?: string | null };
        Update: { read_at?: string };
        Relationships: [];
      };
      feed_items: {
        Row: {
          id: string;
          kind: 'fact' | 'news';
          lang: string;
          title: string;
          body: string | null;
          source_name: string;
          source_url: string;
          image_url: string | null;
          published_on: string;
          external_id: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      feed_comments: {
        Row: { id: string; item_id: string; user_id: string; body: string; created_at: string };
        Insert: { item_id: string; body: string };
        Update: never;
        Relationships: [];
      };
      photo_comments: {
        Row: { id: string; photo_id: string; user_id: string; body: string; created_at: string };
        Insert: { photo_id: string; body: string };
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: never;
        Insert: {
          target_type: ReportTarget;
          target_id: string;
          reason: ReportReason;
          details?: string | null;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      username_available: { Args: { candidate: string }; Returns: boolean };
    };
    Enums: { photo_visibility: PhotoVisibility };
    CompositeTypes: Record<never, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DailyPhoto = Database['public']['Tables']['daily_photos']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type FeedItem = Database['public']['Tables']['feed_items']['Row'];
export type FeedComment = Database['public']['Tables']['feed_comments']['Row'];
export type PhotoComment = Database['public']['Tables']['photo_comments']['Row'];
