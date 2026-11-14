/**
 * Typen der Datenbank, von Hand passend zu supabase/migrations gepflegt.
 * Sobald das Supabase-Projekt steht, lässt sich diese Datei auch erzeugen:
 * npx supabase gen types typescript --project-id <id>
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PhotoVisibility = 'friends' | 'public';

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
