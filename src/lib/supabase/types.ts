/**
 * Hand-written to match supabase/migrations. Regenerate with
 *   pnpm supabase gen types typescript --local > src/lib/supabase/types.ts
 * once the local stack is running.
 */
/**
 * A jsonb column. Deliberately `unknown` rather than a recursive Json union:
 * the app stores real shapes in these columns (a slide, a style, a list of
 * blocks) and an interface without an index signature is not assignable to
 * such a union. Reads are narrowed at the edge — see lib/studio/settings.ts.
 */
type Json = unknown;

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: Row<{
        id: string;
        email: string | null;
        full_name: string | null;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
      }>;
      subscriptions: Row<{
        user_id: string;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        plan: string;
        status: string;
        current_period_end: string | null;
        cancel_at_period_end: boolean;
        updated_at: string;
      }>;
      sessions: Row<{
        id: string;
        user_id: string;
        name: string;
        output_key: string;
        created_at: string;
      }>;
      session_state: Row<{
        session_id: string;
        show_data: Json;
        next_show_data: Json;
        projector: Json;
        stream_style: Json;
        stream_lang: string;
        stage_lang: string;
        timer: Json;
        updated_at: string;
      }>;
      session_workspace: Row<{
        session_id: string;
        blocks: Json;
        live: Json | null;
        setlist: Json;
        active_song_id: string | null;
        tab: string;
        card_size: number;
        updated_at: string;
      }>;
      settings: Row<{
        user_id: string;
        admin_lang: string;
        admin_version: string;
        enabled: Json;
        versions: Json;
        theme: string;
        dynamic_image: string;
        local_image: Json | null;
        font: string;
        align: string;
        lyrics_font: string;
        lyrics_align: string;
        transition_ms: number;
        lang_order: Json;
        lower_third_position: string;
        lower_third_variant: string;
        lyrics_variant: string;
        obs_hidden: boolean;
        stream_lang: string;
        stage_lang: string;
        updated_at: string;
      }>;
      songs: Row<{
        id: string;
        user_id: string;
        title: string;
        slides: Json;
        source: string;
        created_at: string;
        updated_at: string;
      }>;
      audio_categories: Row<{
        id: string;
        user_id: string;
        name: string;
        created_at: string;
      }>;
      audio_tracks: Row<{
        id: string;
        user_id: string;
        kind: 'url' | 'local';
        title: string;
        artist: string;
        src: string | null;
        local_id: string | null;
        size: number | null;
        category_id: string | null;
        duration_ms: number | null;
        position: number;
        library_position: number;
        created_at: string;
      }>;
      audio_playlist: Row<{
        user_id: string;
        track_id: string;
        position: number;
      }>;
      bible_cache: Row<{
        cache_key: string;
        payload: Json;
        fetched_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
