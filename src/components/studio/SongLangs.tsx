'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/cn';
import {
  addLang,
  armLang,
  langsOf,
  lower3rdLangOf,
  MAX_SONG_LANGS,
  removeLang,
  renameLang,
  reorderLangs,
  stageLangOf,
  textOf,
} from '@/lib/lyrics/langs';
import { useDebouncedSave } from '@/lib/studio/useDebouncedSave';
import type { Song, SongLang } from '@/lib/types';

import { DESTS, LangDestHeader, LangDestRadio } from './LangDests';
import { SortHandle } from './SortHandle';
import { LIFTED_SLOT, useSortable } from './sortable';

/** Short, and only has to be unique inside the one song. */
const mintId = () => Math.random().toString(36).slice(2, 10);

/**
 * The languages one song is sung in.
 *
 * The verse table's twin, and deliberately: the operator reads down the same
 * columns to answer the same question, whether the wall is carrying scripture
 * or a chorus. What differs is that a song names its own languages — the label
 * is typed here rather than picked from the catalogue — and that there is no
 * translation to choose underneath.
 *
 * Every change goes out as a whole song, shaped by `lib/lyrics/langs.ts`, so
 * the rail can hand it to the database and the editor can hold it as a draft.
 */
export const SongLangs = ({ song, onChange }: { song: Song; onChange: (song: Song) => void }) => {
  const langs = langsOf(song);

  // One language is a list of one: nothing to stack, nothing to choose between
  // and nothing to switch off. All that is left to say is what it is called.
  const many = langs.length > 1;

  const sortable = useSortable(langs, lang => lang.id, ids => onChange(reorderLangs(song, ids)));

  const stage = stageLangOf(song);
  const lower3rd = lower3rdLangOf(song);

  // Removing a language takes its words off every slide, and there is no undo:
  // the song is written the moment the row goes. So the operator is told how
  // much is about to go — unless the answer is nothing, in which case asking
  // would be a dialog in front of no consequence.
  const [confirming, setConfirming] = useState<SongLang | null>(null);

  /**
   * The name being typed, held here until the typing stops.
   *
   * A label goes through `saveSong`, which is a round trip — and a song is
   * written whole, so "english" typed at speed was seven of them. The field
   * answers the keyboard from this, and the write lands a beat after the last
   * letter, the way every other console write does.
   */
  const [typing, setTyping] = useState<{ id: string; label: string } | null>(null);

  useDebouncedSave(typing, draft => {
    if (draft) onChange(renameLang(song, draft.id, draft.label));
  });

  /** Written now rather than in a beat: the field is being left. */
  const flush = () => {
    if (typing) onChange(renameLang(song, typing.id, typing.label));

    setTyping(null);
  };

  const wordsIn = (lang: SongLang) =>
    song.slides.filter(slide => textOf(song, slide, lang.id).trim().length > 0).length;

  const drop = (lang: SongLang) => {
    if (wordsIn(lang) === 0) {
      onChange(removeLang(song, lang.id));
      return;
    }

    setConfirming(lang);
  };

  return (
    <div>
      {many ? <LangDestHeader /> : null}

      <ul className="space-y-2" {...sortable.list()}>
        {sortable.items.map((lang, index) => (
          <li
            key={lang.id}
            {...sortable.row(lang.id)}
            className={cn(
              'group rounded-studio transition-opacity duration-150',
              sortable.lifted === lang.id && LIFTED_SLOT,
            )}
          >
            <div className="flex items-center gap-1">
              {many ? <SortHandle index={index} className="w-4" {...sortable.handle(lang.id)} /> : null}

              {/* The name is the operator's own word for it — "ქართული",
                  "English", "Singing" — because a song is in whatever the
                  congregation sings, not in what we hold scripture for. */}
              <input
                value={typing?.id === lang.id ? typing.label : lang.label}
                onChange={event => setTyping({ id: lang.id, label: event.target.value })}
                onBlur={flush}
                placeholder={`Language ${index + 1}`}
                aria-label={`What language ${index + 1} of this song is called`}
                className={cn(
                  'min-w-0 flex-1 rounded-studio border border-transparent bg-transparent px-1.5 py-1 text-sm',
                  'font-medium transition-colors duration-150 placeholder:text-studio-faint',
                  'hover:border-studio-border focus:border-studio-accent focus:outline-none',
                  lang.on ? 'text-studio-text' : 'text-studio-faint',
                )}
              />

              {many
                ? DESTS.map(dest => (
                    <LangDestRadio
                      key={dest.key}
                      dest={dest}
                      name={`song-${dest.key}-${song.id}`}
                      label={lang.label || `Language ${index + 1}`}
                      armed={lang.on}
                      chosen={(dest.key === 'stage' ? stage : lower3rd) === lang.id}
                      onPick={() =>
                        onChange(
                          dest.key === 'stage'
                            ? { ...song, stageLang: lang.id }
                            : { ...song, lower3rdLang: lang.id },
                        )
                      }
                    />
                  ))
                : null}

              {many ? (
                <>
                  <Toggle
                    checked={lang.on}
                    onChange={checked => onChange(armLang(song, lang.id, checked))}
                    label={`Show ${lang.label || `language ${index + 1}`} on the projector`}
                  />

                  {/* The first language is the song itself — the words the
                      import or the paste put there. Removing it would promote a
                      translation over them and throw them away, so it has no
                      cross; dragging another language above it moves the words
                      instead, and then this one can go. */}
                  {index === 0 ? (
                    <span
                      className="w-5"
                      title="The first language is the song itself. Drag another above it to change which that is."
                    />
                  ) : (
                    <button
                      type="button"
                      title={`Take ${lang.label || `language ${index + 1}`} out of this song`}
                      onClick={() => drop(lang)}
                      className="flex w-5 justify-center rounded-studio py-0.5 text-studio-faint transition-colors
                        duration-150 hover:bg-studio-surface hover:text-studio-text focus:outline-none
                        focus-visible:ring-2 focus-visible:ring-studio-accent/40"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {langs.length < MAX_SONG_LANGS ? (
        <button
          type="button"
          onClick={() => onChange(addLang(song, { id: mintId(), label: '', on: true }))}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-studio border border-dashed
            border-studio-border py-1.5 text-xs text-studio-muted transition-colors duration-150
            hover:border-studio-accent hover:text-studio-text focus:outline-none focus-visible:ring-2
            focus-visible:ring-studio-accent/40"
        >
          <Plus className="size-3.5" />
          Add a language
        </button>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Remove this language?"
        message={
          confirming
            ? `Every word of ${confirming.label || 'this language'} goes with it — ${wordsIn(confirming)} of this song’s ${song.slides.length} slides have it typed in, and there is no undo. The other languages are untouched.`
            : ''
        }
        confirmLabel="Remove language"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) onChange(removeLang(song, confirming.id));
          setConfirming(null);
        }}
      />
    </div>
  );
};
