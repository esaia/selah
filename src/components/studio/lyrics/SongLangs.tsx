'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/cn';
import {
  addLang,
  armLang,
  isOriginal,
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

import { DESTS, LangDestHeader, LangDestRadio } from '@/components/studio/pickers/LangDests';
import { SortHandle } from '@/components/studio/shared/SortHandle';
import { LIFTED_SLOT, useSortable } from '@/components/studio/shared/sortable';

const mintId = () => Math.random().toString(36).slice(2, 10);

export const SongLangs = ({ song, onChange }: { song: Song; onChange: (song: Song) => void }) => {
  const langs = langsOf(song);

  const many = langs.length > 1;

  const sortable = useSortable(langs, lang => lang.id, ids => onChange(reorderLangs(song, ids)));

  const stage = stageLangOf(song);
  const lower3rd = lower3rdLangOf(song);

  const [confirming, setConfirming] = useState<SongLang | null>(null);

  const [typing, setTyping] = useState<{ id: string; label: string } | null>(null);

  useDebouncedSave(typing, draft => {
    if (draft) onChange(renameLang(song, draft.id, draft.label));
  });

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

              <input
                value={typing?.id === lang.id ? typing.label : lang.label}
                onChange={event => setTyping({ id: lang.id, label: event.target.value })}
                onBlur={flush}
                placeholder="Name this language…"
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

                  {isOriginal(lang.id) ? (
                    <span className="w-5" title="The words this song was written in. They stay." />
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
