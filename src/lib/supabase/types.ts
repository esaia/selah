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
        is_admin: boolean;
      }>;
      subscriptions: Row<{
        user_id: string;
        provider: string;
        provider_customer_id: string | null;
        provider_subscription_id: string | null;
        plan: string;
        status: string;
        current_period_end: string | null;
        cancel_at_period_end: boolean;
        event_at: string | null;
        founding_seat: number | null;
        founding_reserved_at: string | null;
        updated_at: string;
      }>;
      billing_config: Row<{ id: boolean; enforce: boolean }>;
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
        card: Json;
        blackout: Json;
        updated_at: string;
      }>;
      session_workspace: Row<{
        session_id: string;
        blocks: Json;
        live: Json | null;
        setlist: Json;
        open_kind: string;
        open_id: string | null;
        active_song_id: string | null;
        song_scope: string;
        tab: string;
        card_size: number;
        card_draft: Json | null;
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
        stream_font: string;
        stream_align: string;
        stream_lyrics_font: string;
        stream_lyrics_align: string;
        custom_fonts: Json;
        projector_look: string;
        projector_lyrics_look: string;
        custom_template: Json;
        custom_lyrics_template: Json;
        custom_stream_template: Json;
        custom_stream_lyrics_template: Json;
        custom_templates: Json;
        verse_scale: string;
        verse_size: number;
        lyrics_scale: string;
        lyrics_size: number;
        transition_ms: number;
        lang_order: Json;
        lower_third_position: string;
        lower_third_variant: string;
        lyrics_variant: string;
        stream_colors: Json;
        obs_hidden: boolean;
        stream_lang: string;
        stage_lang: string;
        updated_at: string;
      }>;
      name_cards: Row<{
        id: string;
        user_id: string;
        title: string;
        subtitle: string;
        template: string;
        position: number;
        created_at: string;
        updated_at: string;
      }>;
      song_libraries: Row<{
        id: string;
        user_id: string;
        name: string;
        position: number;
        created_at: string;
      }>;
      song_playlists: Row<{
        id: string;
        user_id: string;
        name: string;
        songs: Json;
        position: number;
        created_at: string;
      }>;
      songs: Row<{
        id: string;
        user_id: string;
        title: string;
        slides: Json;
        langs: Json;
        library_id: string | null;
        source: string;
        created_at: string;
        updated_at: string;
      }>;
      audio_categories: Row<{
        id: string;
        user_id: string;
        name: string;
        position: number;
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
      bible_text: Row<{
        lang: string;
        version: string;
        book: number;
        chapter: number;
        wigni: number;
        chapters: number;
        verses: Json;
        fetched_at: string;
      }>;
      bible_translations: Row<{
        id: string;
        user_id: string;
        lang: string;
        label: string;
        psalms: string;
        lang_label: string | null;
        book_names: Json;
        format: string | null;
        books: number;
        verse_count: number;
        created_at: string;
      }>;
      bible_translation_text: Row<{
        translation_id: string;
        book: number;
        chapter: number;
        wigni: number;
        chapters: number;
        verses: Json;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      bible_search: {
        Args: { p_lang: string; p_version: string; p_query: string; p_book?: number | null; p_limit?: number };
        Returns: { book: number; wigni: number; chapter: number; verse: number; text: string }[];
      };
      bible_custom_search: {
        Args: { p_translation: string; p_query: string; p_book?: number | null; p_limit?: number };
        Returns: { book: number; wigni: number; chapter: number; verse: number; text: string }[];
      };
      founding_claimed: { Args: Record<string, never>; Returns: number };
      claim_founding_seat: { Args: { uid: string }; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
