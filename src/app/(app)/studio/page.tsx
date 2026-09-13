import { redirect } from 'next/navigation';

import { QueryProvider } from '@/components/QueryProvider';
import { asCustomTranslations } from '@/lib/bible/custom';
import { Console } from '@/components/studio/Console';
import { AudioProvider, type AudioInitial } from '@/lib/studio/AudioProvider';
import { claimedSpots } from '@/lib/billing/seats';
import { cardFromRow } from '@/lib/lower3rd/card';
import { songFromRow } from '@/lib/lyrics/langs';
import { StudioProvider, type StudioInitial, type Tab } from '@/lib/studio/StudioProvider';
import type { SettingsRow } from '@/lib/studio/settings';
import { configured, createClient } from '@/lib/supabase/server';
import { asTimerState } from '@/lib/timer/model';
import { emptyShowData, type Block, type Live, type ShowData } from '@/lib/types';

export const metadata = { title: 'Console' };

const TABS: Tab[] = ['bible', 'audio', 'lyrics', 'lower3rd', 'stage'];

export default async function StudioPage() {
  if (!configured()) redirect('/login');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/studio');

  const [settings, session, subscription, profile, songs, libraries, playlists, nameCards, translations, claimed] =
    await Promise.all([
      supabase.from('settings').select('*').eq('user_id', user.id).single(),
      supabase
        .from('sessions')
        .select('id, name, output_key')
        .eq('user_id', user.id)
        .order('created_at')
        .limit(1)
        .single(),
      supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('profiles').select('is_admin, avatar_url').eq('id', user.id).maybeSingle(),
      supabase
        .from('songs')
        .select('id, title, slides, langs, library_id, source')
        .eq('user_id', user.id)
        .order('title'),
      supabase.from('song_libraries').select('id, name').eq('user_id', user.id).order('position').order('created_at'),
      supabase
        .from('song_playlists')
        .select('id, name, songs')
        .eq('user_id', user.id)
        .order('position')
        .order('created_at'),
      supabase
        .from('name_cards')
        .select('id, title, subtitle, template, position')
        .eq('user_id', user.id)
        .order('position')
        .order('created_at'),
      supabase
        .from('bible_translations')
        .select('id, lang, label, psalms, lang_label, book_names')
        .eq('user_id', user.id)
        .order('created_at'),
      claimedSpots(),
    ]);

  if (!settings.data || !session.data) {
    throw new Error('This account is missing its workspace. Sign out and back in to rebuild it.');
  }

  const [{ data: workspace }, { data: state }, audioTracks, audioCategories] = await Promise.all([
    supabase.from('session_workspace').select('*').eq('session_id', session.data.id).maybeSingle(),
    supabase
      .from('session_state')
      .select('show_data, next_show_data, timer, card, blackout')
      .eq('session_id', session.data.id)
      .maybeSingle(),
    supabase.from('audio_tracks').select('*').eq('user_id', user.id).order('position').order('created_at'),
    supabase
      .from('audio_categories')
      .select('id, name, position')
      .eq('user_id', user.id)
      .order('position')
      .order('name'),
  ]);

  const audio: AudioInitial = {
    userId: user.id,
    tracks: (audioTracks.data ?? []).map(row => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      src: row.src,
      localId: row.local_id,
      categoryId: row.category_id,
      durationMs: row.duration_ms,
      position: row.position,
      libraryPosition: row.library_position,
    })),
    categories: audioCategories.data ?? [],
  };

  const initial: StudioInitial = {
    session: { id: session.data.id, name: session.data.name, outputKey: session.data.output_key },
    email: user.email ?? '',
    avatarUrl: profile.data?.avatar_url ?? null,
    isAdmin: profile.data?.is_admin ?? false,
    isGuest: user.is_anonymous ?? false,
    settings: settings.data as SettingsRow,
    translations: asCustomTranslations(translations.data),
    workspace: {
      blocks: (workspace?.blocks as Block[]) ?? [],
      live: (workspace?.live as Live) ?? null,
      activeSongId: workspace?.active_song_id ?? null,
      open:
        workspace?.open_id
          ? { kind: workspace.open_kind === 'playlist' ? 'playlist' : 'library', id: workspace.open_id }
          : null,
      tab: TABS.includes(workspace?.tab as Tab) ? (workspace?.tab as Tab) : 'bible',
      cardSize: workspace?.card_size ?? 190,
      cardDraft: workspace?.card_draft ?? null,
    },
    showData: (state?.show_data as ShowData) ?? emptyShowData(),
    nextShowData: (state?.next_show_data as ShowData) ?? emptyShowData(),
    timer: asTimerState(state?.timer),
    cards: (nameCards.data ?? []).map(cardFromRow),
    card: state?.card ?? null,
    blackout: state?.blackout ?? null,
    songs: (songs.data ?? []).map(songFromRow),
    libraries: libraries.data ?? [],
    playlists: (playlists.data ?? []).map(row => ({
      id: row.id,
      name: row.name,
      songs: (row.songs as string[]) ?? [],
    })),
    plan: subscription.data?.plan ?? 'free',
    claimedSpots: claimed,
    billing: {
      status: subscription.data?.status ?? 'active',
      renewsAt: subscription.data?.current_period_end ?? null,
      ending: subscription.data?.cancel_at_period_end ?? false,
    },
  };

  return (
    <QueryProvider>

      <StudioProvider initial={initial}>
        <AudioProvider initial={audio}>
          <Console />
        </AudioProvider>
      </StudioProvider>
    </QueryProvider>
  );
}
