import { redirect } from 'next/navigation';

import { QueryProvider } from '@/components/QueryProvider';
import { Console } from '@/components/studio/Console';
import { AudioProvider, type AudioInitial } from '@/lib/studio/AudioProvider';
import { cardFromRow } from '@/lib/lower3rd/card';
import { StudioProvider, type StudioInitial, type Tab } from '@/lib/studio/StudioProvider';
import type { SettingsRow } from '@/lib/studio/settings';
import { configured, createClient } from '@/lib/supabase/server';
import { asTimerState } from '@/lib/timer/model';
import { emptyShowData, type Block, type Live, type ShowData, type Song } from '@/lib/types';

export const metadata = { title: 'Console' };

const TABS: Tab[] = ['bible', 'audio', 'lyrics', 'lower3rd', 'stage'];

/**
 * The operator's console.
 *
 * Everything it needs is loaded here rather than fetched after paint: opening
 * the console mid-service and waiting for a spinner is exactly the moment that
 * must not happen.
 */
export default async function StudioPage() {
  // Nothing here works without a project; sending them to sign in says so more
  // usefully than a stack trace.
  if (!configured()) redirect('/login');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/studio');

  const [settings, session, subscription, songs, nameCards] = await Promise.all([
    supabase.from('settings').select('*').eq('user_id', user.id).single(),
    supabase.from('sessions').select('id, name, output_key').eq('user_id', user.id).order('created_at').limit(1).single(),
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).maybeSingle(),
    supabase.from('songs').select('id, title, slides, source').eq('user_id', user.id).order('title'),
    // Saved speakers, in the order the operator dragged them.
    supabase
      .from('name_cards')
      .select('id, title, subtitle, template, position')
      .eq('user_id', user.id)
      .order('position')
      .order('created_at'),
  ]);

  // The signup trigger creates all of these; a missing row means the account
  // predates it, and sending them through the console would only fail later.
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
    // The operator's own running order, with the order they were added in as
    // the tie-break for rows that have never been dragged.
    supabase.from('audio_tracks').select('*').eq('user_id', user.id).order('position').order('created_at'),
    // The libraries in the order the operator dragged them into, with the name
    // as the tie-break for any that have never been moved.
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
    settings: settings.data as SettingsRow,
    workspace: {
      blocks: (workspace?.blocks as Block[]) ?? [],
      live: (workspace?.live as Live) ?? null,
      setlist: (workspace?.setlist as string[]) ?? [],
      activeSongId: workspace?.active_song_id ?? null,
      // A row written before the console remembered this says nothing about it,
      // and the library is the honest default: it shows the one song the
      // operator last had open either way.
      songScope: workspace?.song_scope === 'setlist' ? 'setlist' : 'library',
      tab: TABS.includes(workspace?.tab as Tab) ? (workspace?.tab as Tab) : 'bible',
      cardSize: workspace?.card_size ?? 190,
      // The name-card form as the operator left it. A design and a hold picked
      // before the service should still be picked when the console reopens.
      cardDraft: workspace?.card_draft ?? null,
    },
    // What the outputs are showing right now. Without this the console reopens
    // believing nothing is live, and its first style push would tell the
    // projector the same — blanking a screen mid-service.
    showData: (state?.show_data as ShowData) ?? emptyShowData(),
    nextShowData: (state?.next_show_data as ShowData) ?? emptyShowData(),
    // The run in progress, for the same reason: a console reopened mid-service
    // must pick the timer up where it is, not restart it.
    timer: asTimerState(state?.timer),
    // And the name card, if one was up when the console was closed. Read raw
    // and validated inside the provider, which is where the hold arithmetic
    // and the clock correction live.
    cards: (nameCards.data ?? []).map(cardFromRow),
    card: state?.card ?? null,
    // And which screens were left black, so a console reopened during a prayer
    // does not report a bright room.
    blackout: state?.blackout ?? null,
    songs: (songs.data ?? []).map(row => ({
      id: row.id,
      title: row.title,
      slides: row.slides as Song['slides'],
      source: row.source,
    })),
    plan: subscription.data?.plan ?? 'free',
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
