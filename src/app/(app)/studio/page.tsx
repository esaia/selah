import { redirect } from 'next/navigation';

import { QueryProvider } from '@/components/QueryProvider';
import { Console } from '@/components/studio/Console';
import { AudioProvider, type AudioInitial } from '@/lib/studio/AudioProvider';
import { StudioProvider, type StudioInitial, type Tab } from '@/lib/studio/StudioProvider';
import type { SettingsRow } from '@/lib/studio/settings';
import { configured, createClient } from '@/lib/supabase/server';
import { emptyShowData, type Block, type Live, type ShowData, type Song } from '@/lib/types';

export const metadata = { title: 'Console' };

const TABS: Tab[] = ['bible', 'audio', 'lyrics'];

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

  const [settings, session, subscription, songs] = await Promise.all([
    supabase.from('settings').select('*').eq('user_id', user.id).single(),
    supabase.from('sessions').select('id, name, output_key').eq('user_id', user.id).order('created_at').limit(1).single(),
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).maybeSingle(),
    supabase.from('songs').select('id, title, slides, source').eq('user_id', user.id).order('title'),
  ]);

  // The signup trigger creates all of these; a missing row means the account
  // predates it, and sending them through the console would only fail later.
  if (!settings.data || !session.data) {
    throw new Error('This account is missing its workspace. Sign out and back in to rebuild it.');
  }

  const [{ data: workspace }, { data: state }, audioTracks, audioCategories] = await Promise.all([
    supabase.from('session_workspace').select('*').eq('session_id', session.data.id).maybeSingle(),
    supabase.from('session_state').select('show_data').eq('session_id', session.data.id).maybeSingle(),
    supabase.from('audio_tracks').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('audio_categories').select('id, name').eq('user_id', user.id).order('name'),
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
    })),
    categories: audioCategories.data ?? [],
  };

  const initial: StudioInitial = {
    session: { id: session.data.id, name: session.data.name, outputKey: session.data.output_key },
    settings: settings.data as SettingsRow,
    workspace: {
      blocks: (workspace?.blocks as Block[]) ?? [],
      live: (workspace?.live as Live) ?? null,
      setlist: (workspace?.setlist as string[]) ?? [],
      activeSongId: workspace?.active_song_id ?? null,
      tab: TABS.includes(workspace?.tab as Tab) ? (workspace?.tab as Tab) : 'bible',
      cardSize: workspace?.card_size ?? 190,
    },
    // What the outputs are showing right now. Without this the console reopens
    // believing nothing is live, and its first style push would tell the
    // projector the same — blanking a screen mid-service.
    showData: (state?.show_data as ShowData) ?? emptyShowData(),
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
