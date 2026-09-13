'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  Ban,
  Blend,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Circle,
  ImageIcon,
  Minus,
  Plus,
  Redo2,
  Square,
  Type,
  Undo2,
} from 'lucide-react';
import { HiOutlineDuplicate, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import {
  MdFormatAlignCenter,
  MdFormatAlignLeft,
  MdFormatAlignRight,
  MdVerticalAlignBottom,
  MdVerticalAlignCenter,
  MdVerticalAlignTop,
} from 'react-icons/md';

import { CustomSlide } from '@/components/projector/CustomSlide';
import { useLocalFiles } from '@/components/projector/useLocalBackground';
import { IconButton } from '@/components/ui/IconButton';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { loadFolders, loadLocalFiles, type LocalFile, type LocalFolder } from '@/lib/media/localMedia';
import type { LocalFileMeta } from '@/lib/types';
import type { CustomFont } from '@/lib/projector/fonts';
import {
  DEFAULT_GRADIENT,
  filesUsedBy,
  MAX_ELEMENTS,
  newElement,
  SAMPLE_LYRICS,
  sampleShowData,
  startingTemplate,
  textStyleOf,
  type ElementKind,
  type Fit,
  type Frame,
  type Gradient,
  type TextStyle,
  type PictureElement,
  type ShapeElement,
  type SlideTemplate,
  type TemplateElement,
  type TemplateTarget,
  type TextElement,
} from '@/lib/projector/template';
import { DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { CUSTOM_LOOK } from '@/lib/projector/looks';
import { amend, canRedo, canUndo, commit, redo, start, undo } from '@/lib/studio/history';
import {
  alignTo,
  angleFrom,
  clampToFrame,
  HANDLES,
  moveBy,
  normalizeAngle,
  resizeBy,
  snapAngle,
  snapTo,
  unrotate,
  type Edge,
  type Guide,
  type Handle,
} from '@/lib/studio/canvas';
import { projectorStyle, streamLangOf, templatesFor } from '@/lib/studio/settings';
import { limitMessage } from '@/lib/billing/limits';

import { FontPicker } from '@/components/studio/pickers/FontPicker';
import { useStudio } from '@/lib/studio/StudioProvider';
import { labelOf, type Align, type Lang, type ProjectorStyle } from '@/lib/types';

import { ColorField } from '@/components/studio/pickers/ColorField';
import { LIFTED_SLOT, useSortable } from '@/components/studio/shared/sortable';

const TOOLS: { kind: ElementKind; label: string; Icon: typeof Type }[] = [
  { kind: 'text', label: 'Text', Icon: Type },
  { kind: 'rect', label: 'Rectangle', Icon: Square },
  { kind: 'ellipse', label: 'Ellipse', Icon: Circle },
  { kind: 'line', label: 'Line', Icon: Minus },
  { kind: 'picture', label: 'Picture', Icon: ImageIcon },
];

const KIND_LABELS: Record<ElementKind, string> = {
  text: 'Text',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  picture: 'Picture',
};

export type { TemplateTarget };

const VERSE_TOKENS = [
  { name: 'verses', label: 'Verse text' },
  { name: 'reference', label: 'Reference' },
  { name: 'translation', label: 'Translation' },
];

const LYRIC_TOKENS = [{ name: 'lyrics', label: 'Words' }];

const TOKEN_ROWS: Record<TemplateTarget, { name: string; label: string }[]> = {
  verses: VERSE_TOKENS,
  lyrics: LYRIC_TOKENS,
  stream: VERSE_TOKENS,
  streamLyrics: LYRIC_TOKENS,
};

const TokenPicker = ({
  target,
  langs,
  onInsert,
}: {
  target: TemplateTarget;
  langs: string[];
  onInsert: (token: string) => void;
}) => {
  const rows = TOKEN_ROWS[target];

  const Chip = ({ token, title, children }: { token: string; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onClick={() => onInsert(token)}
      className="rounded-[4px] border border-studio-border px-1.5 py-0.5 text-[10px] font-medium text-studio-muted
        transition-colors duration-150 hover:border-studio-faint hover:text-studio-text focus:outline-none
        focus-visible:ring-2 focus-visible:ring-studio-accent/40"
    >
      {children}
    </button>
  );

  if (langs.length < 2) {
    return (
      <div className="flex flex-wrap gap-1">
        {rows.map(row => (
          <Chip key={row.name} token={`{{${row.name}}}`} title={`Insert the ${row.label.toLowerCase()}`}>
            + {row.label}
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {rows.map(row => (
        <div key={row.name} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
          <span className="text-[10px] text-studio-faint">{row.label}</span>

          <div className="flex flex-wrap gap-1">
            <Chip token={`{{${row.name}}}`} title={`Once for each language, in its own: ${langs.join(', ')}`}>
              All
            </Chip>

            {langs.map((lang, index) => (
              <Chip key={index} token={`{{${row.name}:${index + 1}}}`} title={`Language ${index + 1} — ${lang}`}>
                {index + 1}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ALIGNS: {
  value: Align;
  label: string;
  Icon: typeof MdFormatAlignLeft;
}[] = [
  { value: 'left', label: 'Align left', Icon: MdFormatAlignLeft },
  { value: 'center', label: 'Align centre', Icon: MdFormatAlignCenter },
  { value: 'right', label: 'Align right', Icon: MdFormatAlignRight },
];

const VALIGNS: {
  value: TextElement['valign'];
  label: string;
  Icon: typeof MdVerticalAlignTop;
}[] = [
  { value: 'top', label: 'Top', Icon: MdVerticalAlignTop },
  { value: 'middle', label: 'Middle', Icon: MdVerticalAlignCenter },
  { value: 'bottom', label: 'Bottom', Icon: MdVerticalAlignBottom },
];

const EDGES: { edge: Edge; label: string; Icon: typeof Type }[] = [
  { edge: 'left', label: 'Align to the left edge', Icon: AlignStartVertical },
  {
    edge: 'hcenter',
    label: 'Centre across the slide',
    Icon: AlignCenterVertical,
  },
  { edge: 'right', label: 'Align to the right edge', Icon: AlignEndVertical },
  { edge: 'top', label: 'Align to the top edge', Icon: AlignStartHorizontal },
  {
    edge: 'vmiddle',
    label: 'Centre down the slide',
    Icon: AlignCenterHorizontal,
  },
  {
    edge: 'bottom',
    label: 'Align to the bottom edge',
    Icon: AlignEndHorizontal,
  },
];

const KindIcon = ({ kind }: { kind: ElementKind }) => {
  const Icon = TOOLS.find(tool => tool.kind === kind)?.Icon ?? Type;

  return <Icon aria-hidden className="size-3 shrink-0 text-studio-faint" />;
};

const nameOf = (element: TemplateElement): string => {
  if (element.kind === 'text') return element.content.replace(/\s+/g, ' ').trim() || 'Empty text';
  if (element.kind === 'picture') return element.file?.name || 'No picture';

  return KIND_LABELS[element.kind];
};

const NUDGE = 0.002;

const GESTURE_MS = 700;

const uid = () => `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const AddMenu = ({ disabled, onAdd }: { disabled: boolean; onAdd: (kind: ElementKind) => void }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <IconButton
        label="Add a box"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className="border border-studio-border bg-studio-surface"
      >
        <Plus className="size-4" />
      </IconButton>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1 w-40 overflow-hidden rounded-studio border
            border-studio-border bg-studio-bg py-1 shadow-studio-modal"
        >
          {TOOLS.map(tool => (
            <button
              key={tool.kind}
              type="button"
              role="menuitem"
              onClick={() => {
                onAdd(tool.kind);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-studio-muted
                transition-colors duration-150 hover:bg-studio-surface hover:text-studio-text focus:outline-none
                focus-visible:bg-studio-surface focus-visible:text-studio-text"
            >
              <tool.Icon className="size-3.5 shrink-0" />
              {tool.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const Row = ({ label, stack, children }: { label: string; stack?: boolean; children: React.ReactNode }) =>
  stack ? (
    <div>
      <span className="mb-1 block text-[11px] text-studio-muted">{label}</span>
      {children}
    </div>
  ) : (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
      <span className="text-[11px] text-studio-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );

const Toggles = <T,>({
  value,
  options,
  onPick,
}: {
  value: T;
  options: {
    value: T;
    label: string;
    Icon?: typeof MdFormatAlignLeft;
    text?: string;
    style?: React.CSSProperties;
  }[];
  onPick: (value: T) => void;
}) => (
  <div className="flex items-center gap-0.5 rounded-studio border border-studio-border p-0.5">
    {options.map(option => (
      <button
        key={String(option.value)}
        type="button"
        title={option.label}
        aria-label={option.label}
        aria-pressed={value === option.value}
        onClick={() => onPick(option.value)}
        className={cn(
          'flex h-6 min-w-6 flex-1 items-center justify-center rounded-[4px] px-1 text-[11px] font-medium',
          'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
          value === option.value
            ? 'bg-studio-accent text-studio-onaccent'
            : 'text-studio-muted hover:bg-studio-surface hover:text-studio-text',
        )}
      >
        {option.Icon ? (
          <option.Icon className="size-3.5" />
        ) : (
          <span style={option.style}>{option.text}</span>
        )}
      </button>
    ))}
  </div>
);

const Slider = ({
  value,
  min,
  max,
  step = 1,
  suffix = '',
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  label: string;
  onChange: (value: number) => void;
}) => (
  <div className="flex items-center gap-2">
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={event => onChange(Number(event.target.value))}
      style={
        {
          '--range-fill': `${((value - min) / (max - min)) * 100}%`,
        } as React.CSSProperties
      }
      className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-studio-border"
    />

    <span className="w-10 shrink-0 text-right text-[11px] text-studio-muted tabular-nums">
      {Math.round(value * 100) / 100}
      {suffix}
    </span>
  </div>
);

const TextStyleRows = ({
  style,
  fonts,
  patch,
}: {
  style: TextStyle;
  fonts: CustomFont[];
  patch: (change: Partial<TextStyle>) => void;
}) => (
  <>
    <Row label="Font">
      <FontPicker label="Typeface" value={style.font} onChange={value => patch({ font: value })} fonts={fonts} />
    </Row>

    <Row label="Size" stack>
      <Select
        className="w-full"
        value={style.autoSize}
        onChange={value => patch({ autoSize: value === 'fixed' ? 'fixed' : 'shrink' })}
        options={[
          { value: 'shrink', label: 'Scale to fit' },
          { value: 'fixed', label: 'Hold the size' },
        ]}
      />

      <div className="mt-1.5">
        <Slider
          label="Type size"
          value={style.size}
          min={0.5}
          max={30}
          step={0.1}
          suffix="%"
          onChange={size => patch({ size })}
        />
      </div>

      <p className="mt-1 text-[10px] leading-snug text-studio-faint">
        {style.autoSize === 'shrink'
          ? 'As large as this, and smaller when the words need it. A passage never spills.'
          : 'Exactly this, whatever the words are. Anything too long for the box is cut off.'}
      </p>
    </Row>

    <Row label="Style">
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <Toggles
            value={style.weight}
            options={[
              { value: 400 as const, label: 'Regular', text: 'Aa', style: { fontWeight: 400 } },
              { value: 600 as const, label: 'Semi-bold', text: 'Aa', style: { fontWeight: 600 } },
              { value: 700 as const, label: 'Bold', text: 'Aa', style: { fontWeight: 700 } },
            ]}
            onPick={weight => patch({ weight })}
          />
        </div>

        <button
          type="button"
          title="Italic"
          aria-label="Italic"
          aria-pressed={style.italic}
          onClick={() => patch({ italic: !style.italic })}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-studio border border-studio-border',
            'text-[13px] transition-colors duration-150 focus:outline-none focus-visible:ring-2',
            'focus-visible:ring-studio-accent/40',
            style.italic
              ? 'bg-studio-accent text-studio-onaccent'
              : 'text-studio-muted hover:bg-studio-surface hover:text-studio-text',
          )}
        >
          <span className="font-serif italic">I</span>
        </button>
      </div>
    </Row>

    <Row label="Case">
      <Toggles
        value={style.caps}
        options={[
          { value: 'none' as const, label: 'As typed', text: 'Aa' },
          { value: 'upper' as const, label: 'Upper case', text: 'AB' },
          { value: 'lower' as const, label: 'Lower case', text: 'ab' },
        ]}
        onPick={caps => patch({ caps })}
      />
    </Row>

    <Row label="Colour" stack>
      <ColorField
        label="Text"
        hint="The colour the words are set in"
        value={style.color}
        fallback="#ffffff"
        onPick={color => patch({ color })}
        onClear={() => patch({ color: '#ffffff' })}
      />
    </Row>

    <Row label="Align">
      <Toggles value={style.align} options={ALIGNS} onPick={align => patch({ align })} />
    </Row>

    <Row label="Line height">
      <Slider
        label="Line height"
        value={style.lineHeight}
        min={0.8}
        max={2.4}
        step={0.05}
        onChange={lineHeight => patch({ lineHeight })}
      />
    </Row>

    <Row label="Shadow">
      <Select
        value={style.shadow}
        onChange={value => patch({ shadow: value as TextElement['shadow'] })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'soft', label: 'Soft' },
          { value: 'strong', label: 'Strong' },
        ]}
      />
    </Row>

    <Row label="Text outline" stack>
      <ColorField
        label="Text outline"
        hint="An outline round the letters themselves"
        value={style.stroke || undefined}
        fallback="#000000"
        onPick={stroke => patch({ stroke })}
        onClear={() => patch({ stroke: '' })}
      />
    </Row>

    {style.stroke ? (
      <Row label="Thickness">
        <Slider
          label="Outline thickness"
          value={style.strokeWidth}
          min={0}
          max={2}
          step={0.05}
          suffix="%"
          onChange={strokeWidth => patch({ strokeWidth })}
        />
      </Row>
    ) : null}

    <Row label="Plate">
      <Toggles
        value={style.plateKind}
        options={[
          { value: 'none' as const, label: 'No plate', Icon: Ban },
          { value: 'color' as const, label: 'A flat colour', Icon: Square },
          { value: 'gradient' as const, label: 'A gradient between two colours', Icon: Blend },
        ]}
        onPick={plateKind => patch({ plateKind })}
      />
    </Row>

    {style.plateKind === 'color' ? (
      <Row label="Colour" stack>
        <ColorField
          label="Plate"
          hint="What the panel is painted in"
          value={style.plate || undefined}
          fallback="#00000000"
          onPick={plate => patch({ plate })}
          onClear={() => patch({ plate: '' })}
        />
      </Row>
    ) : null}

    {style.plateKind === 'gradient' ? (
      <GradientRows value={style.plateGradient} onChange={plateGradient => patch({ plateGradient })} />
    ) : null}

    {style.plateKind !== 'none' ? (
      <>
        <Row label="Behind">
          <Toggles
            value={style.plateSpan}
            options={[
              { value: 'box' as const, label: 'One panel behind the whole box', text: 'The box' },
              { value: 'line' as const, label: 'A band behind each line', text: 'Each line' },
            ]}
            onPick={plateSpan => patch({ plateSpan })}
          />
        </Row>

        {style.plateSpan === 'line' ? (
          <Row label="Band gap">
            <Slider
              label="Gap between the bands"
              value={style.plateGap}
              min={0}
              max={0.6}
              step={0.01}
              onChange={plateGap => patch({ plateGap })}
            />
          </Row>
        ) : null}
      </>
    ) : null}

    {style.plateKind !== 'none' ? (
      <>
        <Row label="Border" stack>
          <ColorField
            label="Plate border"
            hint="A border round the panel"
            value={style.plateStroke || undefined}
            fallback="#ffffff"
            onPick={plateStroke => patch({ plateStroke })}
            onClear={() => patch({ plateStroke: '' })}
          />
        </Row>

        {style.plateStroke ? (
          <Row label="Thickness">
            <Slider
              label="Border thickness"
              value={style.plateStrokeWidth}
              min={0}
              max={2}
              step={0.05}
              suffix="%"
              onChange={plateStrokeWidth => patch({ plateStrokeWidth })}
            />
          </Row>
        ) : null}
      </>
    ) : null}

    <Row label="Radius">
      <Slider
        label="Corner radius"
        value={style.radius}
        min={0}
        max={20}
        step={0.1}
        suffix="%"
        onChange={radius => patch({ radius })}
      />
    </Row>
  </>
);

const TextInspector = ({
  element,
  target,
  fonts,
  armed,
  holds,
  patch,
}: {
  element: TextElement;
  target: TemplateTarget;
  fonts: CustomFont[];
  armed: string[];
  holds: number;
  patch: (change: Partial<TextElement>) => void;
}) => (
  <>
    <div>
      <textarea
        rows={3}
        value={element.content}
        spellCheck={false}
        aria-label="What this box says"
        onChange={event => patch({ content: event.target.value })}
        className="studio-scroll w-full resize-y rounded-studio border border-studio-border bg-studio-bg p-2
          text-xs text-studio-text focus:border-studio-faint focus:outline-none focus-visible:ring-2
          focus-visible:ring-studio-accent/40"
      />

      <div className="mt-1.5">
        <TokenPicker
          target={target}
          langs={armed}
          onInsert={token =>
            patch({
              content: `${element.content}${element.content ? '\n' : ''}${token}`,
            })
          }
        />
      </div>

      <p className="mt-1 text-[10px] leading-snug text-studio-faint">
        {target === 'stream' || target === 'streamLyrics'
          ? 'The stream carries one language — the one the rail points at it, and the one the song points at it — so a box here holds that and nothing else.'
          : target === 'lyrics'
          ? 'Words covers every language the song is sung in — there is nothing to name, because a song’s languages are its own. Stack runs them together inside the box; a box each cuts the box into equal shares, and a song with one language fills the box the pair were sharing. The canvas shows two so you can see how they sit.'
          : armed.length > 1
            ? 'All draws the box once per language, each in its own. Stack runs them together inside the box; a box each cuts the box into equal shares — so a language switched off gives its share back and what is left re-centres, which two hand-placed boxes cannot do. A numbered token pins a box to one language instead, for giving it a font and colour of its own.'
            : 'A box with nothing to say is not drawn, so a template built for three languages still works when one is up.'}
      </p>

      {/\{\{\s*(?:verses|lyrics)/i.test(element.content) ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-studio-muted">Punctuation</span>

          <Toggles
            value={element.stripPunctuation}
            options={[
              { value: false, label: 'Show it as typed', text: 'Keep' },
              { value: true, label: 'Drop commas, periods and the like', text: 'Ignore' },
            ]}
            onPick={stripPunctuation => patch({ stripPunctuation })}
          />
        </div>
      ) : null}
    </div>

    <TextStyleRows style={element} fonts={fonts} patch={patch} />

    {/\{\{\s*(?:verses|lyrics)/i.test(element.content) ? (
      <Row label="Line breaks">
        <Toggles
          value={element.preserveLineBreaks}
          options={[
            { value: false, label: 'Rewrap to fit the box', text: 'Rewrap' },
            { value: true, label: 'Keep every break as it was typed', text: 'Keep as typed' },
          ]}
          onPick={preserveLineBreaks => patch({ preserveLineBreaks })}
        />
      </Row>
    ) : null}

    <Row label="V-align">
      <Toggles value={element.valign} options={VALIGNS} onPick={valign => patch({ valign })} />
    </Row>

    <Row label="Padding">
      <Slider
        label="Padding"
        value={element.padding}
        min={0}
        max={12}
        step={0.1}
        suffix="%"
        onChange={padding => patch({ padding })}
      />
    </Row>

    {holds > 1 ? (
      <Row label="Languages">
        <Toggles
          value={element.perLanguage}
          options={[
            { value: 'stack' as const, label: 'Stack the languages in this box', text: 'Stacked' },
            { value: 'split' as const, label: 'Give each language a share of this box', text: 'A box each' },
          ]}
          onPick={perLanguage => patch({ perLanguage })}
        />
      </Row>
    ) : null}

    {holds > 1 && element.perLanguage === 'split' ? (
      <Row label="Gap">
        <Slider
          label="Gap between the shares"
          value={element.gap}
          min={0}
          max={12}
          step={0.1}
          suffix="%"
          onChange={gap => patch({ gap })}
        />
      </Row>
    ) : null}

    {holds > 1 && element.perLanguage === 'split' ? (
      <>
        <Row label="Translation">
          <Toggles
            value={Boolean(element.secondary)}
            options={[
              { value: false, label: 'Set exactly like the first language', text: 'Same' },
              { value: true, label: 'Give the second language a style of its own', text: 'Its own' },
            ]}
            onPick={own => patch({ secondary: own ? textStyleOf(element) : null })}
          />
        </Row>

        {element.secondary ? (
          <div className="space-y-3 rounded-studio border border-studio-border p-2">
            <span className="block text-[10px] font-semibold tracking-wide text-studio-faint uppercase">
              Second language
            </span>

            <TextStyleRows
              style={element.secondary}
              fonts={fonts}
              patch={change => patch({ secondary: { ...element.secondary!, ...change } })}
            />
          </div>
        ) : null}
      </>
    ) : null}
  </>
);

const PicturePicker = ({
  chosen,
  pictures,
  shelves,
  thumbs,
  onPick,
}: {
  chosen: LocalFileMeta | null;
  pictures: LocalFile[];
  shelves: LocalFolder[];
  thumbs: Record<string, string>;
  onPick: (file: LocalFileMeta | null) => void;
}) => {
  const [shelf, setShelf] = useState('');

  const shown = shelf ? pictures.filter(picture => picture.folder === shelf) : pictures;

  if (!pictures.length) {
    return (
      <p className="text-[10px] leading-snug text-studio-faint">
        No pictures yet. Add some in the Media pane and they will show up here.
      </p>
    );
  }

  return (
    <>
      {shelves.length > 1 ? (
        <Select
          className="mb-1.5 w-full"
          value={shelf}
          onChange={setShelf}
          options={[
            { value: '', label: `All pictures (${pictures.length})` },
            ...shelves.map(one => ({ value: one.id, label: one.name })),
          ]}
        />
      ) : null}

      <div className="studio-scroll grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto p-1 pr-2">
        <button
          type="button"
          aria-pressed={!chosen}
          onClick={() => onPick(null)}
          className={cn(
            `flex aspect-video items-center justify-center rounded-[4px] text-[10px] text-studio-faint
             transition-shadow duration-150 focus:outline-none`,
            !chosen ? 'ring-2 ring-studio-accent' : 'ring-1 ring-studio-border hover:ring-studio-faint',
          )}
        >
          None
        </button>

        {shown.map(picture => (
          <button
            key={picture.id}
            type="button"
            title={picture.name}
            aria-label={picture.name}
            aria-pressed={chosen?.id === picture.id}
            onClick={() =>
              onPick({ id: picture.id, name: picture.name, type: picture.type, size: picture.size })
            }
            className={cn(
              'block overflow-hidden rounded-[4px] transition-shadow duration-150 focus:outline-none',
              chosen?.id === picture.id
                ? 'ring-2 ring-studio-accent'
                : 'ring-1 ring-studio-border hover:ring-studio-faint',
            )}
          >
            <img src={thumbs[picture.id]} alt="" loading="lazy" className="aspect-video w-full object-cover" />
          </button>
        ))}
      </div>
    </>
  );
};

const FitRow = ({ value, onPick }: { value: Fit; onPick: (fit: Fit) => void }) => (
  <Row label="Fit">
    <Toggles
      value={value}
      options={[
        { value: 'contain' as const, label: 'Fit the whole picture inside the box', text: 'Fit' },
        { value: 'cover' as const, label: 'Crop it to fill the box', text: 'Crop' },
        { value: 'fill' as const, label: 'Stretch it to the box, ignoring its shape', text: 'Stretch' },
      ]}
      onPick={onPick}
    />
  </Row>
);

const RadiusRow = ({ value, onChange }: { value: number; onChange: (radius: number) => void }) => (
  <Row label="Radius">
    <Slider label="Corner radius" value={value} min={0} max={20} step={0.1} suffix="%" onChange={onChange} />
  </Row>
);

const GradientRows = ({ value, onChange }: { value: Gradient; onChange: (gradient: Gradient) => void }) => (
  <>
    <Row label="From" stack>
      <ColorField
        label="From"
        hint="Where the gradient starts"
        value={value.from}
        fallback={DEFAULT_GRADIENT.from}
        onPick={from => onChange({ ...value, from })}
        onClear={() => onChange({ ...value, from: DEFAULT_GRADIENT.from })}
      />
    </Row>

    <Row label="To" stack>
      <ColorField
        label="To"
        hint="Where it ends"
        value={value.to}
        fallback={DEFAULT_GRADIENT.to}
        onPick={to => onChange({ ...value, to })}
        onClear={() => onChange({ ...value, to: DEFAULT_GRADIENT.to })}
      />
    </Row>

    <Row label="Angle">
      <Slider
        label="Gradient angle"
        value={value.angle}
        min={-180}
        max={180}
        step={1}
        suffix="°"
        onChange={angle => onChange({ ...value, angle })}
      />
    </Row>
  </>
);

const ShapeInspector = ({
  element,
  pictures,
  shelves,
  thumbs,
  patch,
}: {
  element: ShapeElement;
  pictures: LocalFile[];
  shelves: LocalFolder[];
  thumbs: Record<string, string>;
  patch: (change: Partial<ShapeElement>) => void;
}) => (
  <>
    <Row label="Fill">
      <Toggles
        value={element.fillKind}
        options={[
          { value: 'none' as const, label: 'No fill', Icon: Ban },
          { value: 'color' as const, label: 'A flat colour', Icon: Square },
          { value: 'gradient' as const, label: 'A gradient between two colours', Icon: Blend },
          { value: 'image' as const, label: 'A picture, clipped to the shape', Icon: ImageIcon },
        ]}
        onPick={fillKind => patch({ fillKind })}
      />
    </Row>

    {element.fillKind === 'color' ? (
      <Row label="Colour" stack>
        <ColorField
          label="Fill"
          hint="What the shape is painted in"
          value={element.fill || undefined}
          fallback="#00000000"
          onPick={fill => patch({ fill })}
          onClear={() => patch({ fill: '' })}
        />
      </Row>
    ) : null}

    {element.fillKind === 'gradient' ? (
      <GradientRows value={element.gradient} onChange={gradient => patch({ gradient })} />
    ) : null}

    {element.fillKind === 'image' ? (
      <>
        <Row label="Picture" stack>
          <PicturePicker
            chosen={element.file}
            pictures={pictures}
            shelves={shelves}
            thumbs={thumbs}
            onPick={file => patch({ file })}
          />
        </Row>

        <FitRow value={element.fit} onPick={fit => patch({ fit })} />
      </>
    ) : null}

    {element.kind === 'line' ? (
      <p className="text-[10px] leading-snug text-studio-faint">
        A line is thickened by dragging its edge, and drawn round-ended.
      </p>
    ) : (
      <>
        <Row label="Stroke" stack>
          <ColorField
            label="Stroke"
            hint="The outline round the shape"
            value={element.stroke || undefined}
            fallback="#ffffff"
            onPick={stroke => patch({ stroke })}
            onClear={() => patch({ stroke: '' })}
          />
        </Row>

        <Row label="Thickness">
          <Slider
            label="Stroke thickness"
            value={element.strokeWidth}
            min={0}
            max={4}
            step={0.05}
            suffix="%"
            onChange={strokeWidth => patch({ strokeWidth })}
          />
        </Row>

        {element.kind === 'rect' ? (
          <RadiusRow value={element.radius} onChange={radius => patch({ radius })} />
        ) : null}
      </>
    )}
  </>
);

const PictureInspector = ({
  element,
  pictures,
  shelves,
  thumbs,
  patch,
}: {
  element: PictureElement;
  pictures: LocalFile[];
  shelves: LocalFolder[];
  thumbs: Record<string, string>;
  patch: (change: Partial<PictureElement>) => void;
}) => (
  <>
    <Row label="Picture" stack>
      <PicturePicker
        chosen={element.file}
        pictures={pictures}
        shelves={shelves}
        thumbs={thumbs}
        onPick={file => patch({ file })}
      />
    </Row>

    <FitRow value={element.fit} onPick={fit => patch({ fit })} />

    <RadiusRow value={element.radius} onChange={radius => patch({ radius })} />

    <p className="text-[10px] leading-snug text-studio-faint">
      Pictures stay on this machine. A projector pulls one over the same connection it pulls a background over.
    </p>
  </>
);

const HANDLE_STYLE: Record<Handle, { left: string; top: string; cursor: string }> = {
  nw: { left: '0%', top: '0%', cursor: 'nwse-resize' },
  n: { left: '50%', top: '0%', cursor: 'ns-resize' },
  ne: { left: '100%', top: '0%', cursor: 'nesw-resize' },
  e: { left: '100%', top: '50%', cursor: 'ew-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
  s: { left: '50%', top: '100%', cursor: 'ns-resize' },
  sw: { left: '0%', top: '100%', cursor: 'nesw-resize' },
  w: { left: '0%', top: '50%', cursor: 'ew-resize' },
};

const boxStyle = (frame: Frame, rotation = 0): React.CSSProperties => ({
  position: 'absolute',
  left: `${frame.x * 100}%`,
  top: `${frame.y * 100}%`,
  width: `${frame.w * 100}%`,
  height: `${frame.h * 100}%`,
  transform: rotation ? `rotate(${rotation}deg)` : undefined,
});

export const TemplateEditor = ({
  target,
  id,
  onClose,
}: {
  target: TemplateTarget;
  id: string;
  onClose: () => void;
}) => {
  const { settings, update, room } = useStudio();

  const lyrics = target === 'lyrics' || target === 'streamLyrics';
  const stream = target === 'stream' || target === 'streamLyrics';

  const entry = templatesFor(settings, target).find(row => row.id === id);

  const locked = !entry && !room('custom_templates');

  const saved = entry?.template ?? startingTemplate(target);

  const [name, setName] = useState(entry?.name ?? 'Custom');

  const [history, setHistory] = useState(() => start(saved));

  const draft = history.present;

  const gesture = useRef<{ key: string; at: number } | null>(null);

  const holding = useRef(false);

  const edit = useCallback((key: string, next: (current: SlideTemplate) => SlideTemplate) => {
    const now = Date.now();
    const open = gesture.current?.key === key;
    const held = open && (holding.current || now - (gesture.current?.at ?? 0) < GESTURE_MS);

    gesture.current = { key, at: now };

    setHistory(current => (held ? amend(current, next(current.present)) : commit(current, next(current.present))));
  }, []);

  const act = useCallback(
    (next: (current: SlideTemplate) => SlideTemplate) => {
      gesture.current = null;
      holding.current = false;
      edit(`act-${Date.now()}-${Math.random()}`, next);
    },
    [edit],
  );

  const step = useCallback((move: typeof undo) => {
    gesture.current = null;
    holding.current = false;
    setHistory(current => move(current));
  }, []);

  const [selected, setSelected] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [turning, setTurning] = useState(false);
  const [pictures, setPictures] = useState<LocalFile[]>([]);
  const [shelves, setShelves] = useState<LocalFolder[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const clipboard = useRef<TemplateElement | null>(null);

  const bibleLangs: Lang[] = settings.langOrder.filter(lang => settings.enabled[lang]);

  const armed: string[] = stream || lyrics ? [] : bibleLangs.map(lang => labelOf(lang));
  const holds = stream ? 1 : lyrics ? 2 : armed.length;

  const canvasLangs: Lang[] = stream ? [streamLangOf(settings)] : bibleLangs;

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    handle: Handle | 'turn' | null;
    x: number;
    y: number;
    frame: Frame;
    rotation: number;
    grabbed: number;
    box: DOMRect;
  } | null>(null);

  useEffect(() => {
    let live: string[] = [];

    void Promise.all([loadFolders(), loadLocalFiles()])
      .then(([folders, files]) => {
        const images = files.filter(file => file.type.startsWith('image/'));

        setShelves(folders);
        setPictures(images);
        setThumbs(
          Object.fromEntries(
            images.map(record => {
              const url = URL.createObjectURL(record.file);

              live.push(url);

              return [record.id, url];
            }),
          ),
        );
      })
      .catch(() => {});

    return () => {
      live.forEach(url => URL.revokeObjectURL(url));
      live = [];
    };
  }, []);

  const assets = useLocalFiles(
    useMemo(() => filesUsedBy(draft), [draft]),
    null,
  );

  const element = draft.elements.find(one => one.id === selected) ?? null;

  const style: ProjectorStyle = {
    ...projectorStyle(settings),
    template: draft,
    fonts: settings.customFonts,
    order: lyrics ? [] : canvasLangs,
    enabled: lyrics ? {} : Object.fromEntries(canvasLangs.map(lang => [lang, true])),
    ...(stream ? { lyricsLang: 'sample-1' } : {}),
    ...(lyrics ? { lyricsTemplate: draft, lyricsLook: CUSTOM_LOOK } : { look: CUSTOM_LOOK }),
  };

  const sample = lyrics ? SAMPLE_LYRICS : sampleShowData(canvasLangs);

  const background =
    stream || settings.theme === LOCAL_THEME
      ? ''
      : settings.theme === DYNAMIC_THEME
        ? settings.dynamicImage
        : themeSrc(settings.theme);

  const replace = (id: string, change: Partial<TemplateElement>) =>
    edit(`${id}:${Object.keys(change).join(',')}`, current => ({
      elements: current.elements.map(one => (one.id === id ? ({ ...one, ...change } as TemplateElement) : one)),
    }));

  const add = (kind: ElementKind) => {
    if (draft.elements.length >= MAX_ELEMENTS) return;

    const created = newElement(kind, uid());

    act(current => ({ elements: [...current.elements, created] }));
    setSelected(created.id);
  };

  const remove = (id: string) => {
    act(current => ({
      elements: current.elements.filter(one => one.id !== id),
    }));
    setSelected(null);
  };

  const paste = (source: TemplateElement | null) => {
    if (!source || draft.elements.length >= MAX_ELEMENTS) return;

    const copy = {
      ...source,
      id: uid(),
      frame: {
        ...source.frame,
        x: source.frame.x + 0.02,
        y: source.frame.y + 0.02,
      },
    } as TemplateElement;

    act(current => ({ elements: [...current.elements, copy] }));
    setSelected(copy.id);
  };

  const duplicate = (id: string) => paste(draft.elements.find(one => one.id === id) ?? null);

  const sortable = useSortable(
    [...draft.elements].reverse(),
    one => one.id,
    ids =>
      act(current => ({
        elements: [...ids]
          .reverse()
          .map(id => current.elements.find(one => one.id === id))
          .filter((one): one is TemplateElement => Boolean(one)),
      })),
    { byHandle: false },
  );

  const restack = (id: string, by: number) =>
    act(current => {
      const index = current.elements.findIndex(one => one.id === id);
      const to = index + by;

      if (index < 0 || to < 0 || to >= current.elements.length) return current;

      const elements = [...current.elements];

      elements.splice(to, 0, ...elements.splice(index, 1));

      return { elements };
    });

  const centreOf = (frame: Frame, box: DOMRect) => ({
    cx: box.left + (frame.x + frame.w / 2) * box.width,
    cy: box.top + (frame.y + frame.h / 2) * box.height,
  });

  const startDrag = (event: React.PointerEvent, id: string, handle: Handle | 'turn' | null) => {
    const box = canvasRef.current?.getBoundingClientRect();
    const target = draft.elements.find(one => one.id === id);

    if (!box || !target) return;

    event.preventDefault();
    event.stopPropagation();

    const { cx, cy } = centreOf(target.frame, box);

    setSelected(id);
    setTurning(handle === 'turn');
    gesture.current = null;
    holding.current = true;
    dragRef.current = {
      id,
      handle,
      x: event.clientX,
      y: event.clientY,
      frame: target.frame,
      rotation: target.rotation,
      grabbed: angleFrom(cx, cy, event.clientX, event.clientY),
      box,
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;

    if (!drag) return;

    if (drag.handle === 'turn') {
      const { cx, cy } = centreOf(drag.frame, drag.box);
      const turned = drag.rotation + angleFrom(cx, cy, event.clientX, event.clientY) - drag.grabbed;

      replace(drag.id, { rotation: event.shiftKey ? snapAngle(turned) : Math.round(normalizeAngle(turned)) });

      return;
    }

    if (drag.handle) {
      const local = unrotate(event.clientX - drag.x, event.clientY - drag.y, drag.rotation);

      replace(drag.id, {
        frame: resizeBy(drag.frame, drag.handle, local.dx / drag.box.width, local.dy / drag.box.height),
      });

      return;
    }

    const dx = (event.clientX - drag.x) / drag.box.width;
    const dy = (event.clientY - drag.y) / drag.box.height;

    const others = draft.elements.filter(one => one.id !== drag.id).map(one => one.frame);
    const snapped = snapTo(clampToFrame(moveBy(drag.frame, dx, dy)), others);

    setGuides(snapped.guides);
    replace(drag.id, { frame: snapped.frame });
  };

  const endDrag = () => {
    dragRef.current = null;
    holding.current = false;
    gesture.current = null;
    setGuides([]);
    setTurning(false);
  };

  useEffect(() => {
    const typing = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;

      return Boolean(node?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node?.tagName ?? ''));
    };

    const onKey = (event: KeyboardEvent) => {
      if (typing(event.target)) return;

      if (event.key === 'Escape') {
        setSelected(null);

        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        step(event.shiftKey ? redo : undo);

        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        step(redo);

        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        paste(clipboard.current);

        return;
      }

      if (!element) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        remove(element.id);

        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        clipboard.current = element;

        return;
      }

      const by = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }[event.key];

      if (!by) return;

      event.preventDefault();

      const distance = NUDGE * (event.shiftKey ? 10 : 1);

      replace(element.id, {
        frame: clampToFrame(moveBy(element.frame, by[0] * distance, by[1] * distance)),
      });
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  });

  const save = () => {
    if (locked) return;

    update({
      customTemplates: settings.customTemplates.map(row =>
        row.id === id ? { ...row, name: name.trim() || 'Custom', template: draft } : row,
      ),
    });
    onClose();
  };

  const discard = () => {
    update({ customTemplates: settings.customTemplates.filter(row => row.id !== id) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-full max-h-[46rem] w-full max-w-7xl flex-col overflow-hidden rounded-studio-lg bg-studio-bg
          shadow-studio-modal"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-studio-border px-4">
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            aria-label={
              stream
                ? lyrics
                  ? 'The name of this song strap'
                  : 'The name of this strap'
                : lyrics
                  ? 'The name of this song slide'
                  : 'The name of this slide'
            }
            placeholder="Custom"
            className="min-w-0 flex-1 rounded-studio bg-transparent px-1.5 py-1 text-sm font-semibold text-studio-text
              placeholder:text-studio-faint hover:bg-studio-surface focus:bg-studio-surface focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          />

          <div className="flex items-center gap-2">
            {locked ? null : (
              <IconButton label="Delete this layout" tone="danger" onClick={discard}>
                <HiOutlineTrash className="text-base" />
              </IconButton>
            )}

            <div className="flex items-center gap-0.5 rounded-studio border border-studio-border bg-studio-surface p-0.5">
              <IconButton label="Undo (⌘Z)" disabled={!canUndo(history)} onClick={() => step(undo)}>
                <Undo2 className="size-4" />
              </IconButton>

              <IconButton label="Redo (⇧⌘Z)" disabled={!canRedo(history)} onClick={() => step(redo)}>
                <Redo2 className="size-4" />
              </IconButton>
            </div>

            <AddMenu disabled={draft.elements.length >= MAX_ELEMENTS} onAdd={add} />

            <IconButton label="Close" onClick={onClose}>
              <HiOutlineX className="text-base" />
            </IconButton>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div
            role="presentation"
            onPointerDown={() => setSelected(null)}
            className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4"
          >
            <div
              ref={canvasRef}
              role="presentation"
              aria-label="The custom slide canvas"
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={cn(
                'relative aspect-video w-full max-w-4xl touch-none overflow-hidden rounded-studio',
                'bg-cover bg-center ring-1 ring-studio-border',
                stream ? 'l3-ground' : 'bg-studio-slide',
              )}
              style={background ? { backgroundImage: `url(${background})` } : undefined}
            >
              {stream ? null : <div className="absolute inset-0 bg-black/55" />}

              <CustomSlide template={draft} showData={sample} style={style} assets={assets} />

              {guides.map(guide => (
                <div
                  key={`${guide.axis}-${guide.at}`}
                  aria-hidden
                  className="pointer-events-none absolute bg-studio-accent/80"
                  style={
                    guide.axis === 'x'
                      ? {
                          left: `${guide.at * 100}%`,
                          top: 0,
                          bottom: 0,
                          width: 1,
                        }
                      : {
                          top: `${guide.at * 100}%`,
                          left: 0,
                          right: 0,
                          height: 1,
                        }
                  }
                />
              ))}

              {draft.elements.map(one => (
                <div
                  key={one.id}
                  role="presentation"
                  onPointerDown={event => startDrag(event, one.id, null)}
                  style={{ ...boxStyle(one.frame, one.rotation), cursor: 'move' }}
                  className={cn(
                    'transition-colors duration-100',
                    selected === one.id
                      ? 'outline outline-2 outline-studio-accent'
                      : 'outline outline-1 outline-transparent hover:outline-white/40',
                  )}
                />
              ))}

              {element ? (
                <div
                  className="pointer-events-none absolute"
                  style={boxStyle(element.frame, element.rotation)}
                >
                  {HANDLES.map(handle => (
                    <div
                      key={handle}
                      role="presentation"
                      onPointerDown={event => startDrag(event, element.id, handle)}
                      className="pointer-events-auto absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full
                        border border-white bg-studio-accent"
                      style={HANDLE_STYLE[handle]}
                    />
                  ))}

                  <div
                    role="presentation"
                    title="Drag to turn — hold Shift for 15° steps"
                    onPointerDown={event => startDrag(event, element.id, 'turn')}
                    className="pointer-events-auto absolute top-[-18px] left-1/2 size-3 -translate-x-1/2 cursor-grab
                      rounded-full border-2 border-studio-accent bg-studio-bg"
                  />

                  {turning ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-[-42px] left-1/2 rounded-[4px] bg-studio-accent
                        px-1.5 py-0.5 text-[10px] font-semibold text-studio-onaccent tabular-nums"
                      style={{ transform: `translateX(-50%) rotate(${-element.rotation}deg)` }}
                    >
                      {element.rotation}°
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <aside
            className="studio-scroll flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t
              border-studio-border p-4 lg:w-80 lg:border-t-0 lg:border-l"
          >
            {!element ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-studio-text uppercase">Layers</span>
                  <span className="text-[10px] text-studio-faint tabular-nums">
                    {draft.elements.length} of {MAX_ELEMENTS}
                  </span>
                </div>

                {draft.elements.length ? (
                  <ul className="space-y-0.5" {...sortable.list()}>
                    {sortable.items.map((one, index) => (
                      <li
                        key={one.id}
                        {...sortable.row(one.id)}
                        className={cn(
                          `group flex cursor-grab items-center gap-1 rounded-studio border border-transparent pr-0.5
                           transition-colors duration-150 hover:border-studio-border hover:bg-studio-surface`,
                          sortable.lifted === one.id && LIFTED_SLOT,
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelected(one.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1 text-left focus:outline-none
                            focus-visible:ring-2 focus-visible:ring-studio-accent/40"
                        >
                          <KindIcon kind={one.kind} />
                          <span className="min-w-0 flex-1 truncate text-[11px] text-studio-muted">{nameOf(one)}</span>
                        </button>

                        <span
                          className="flex shrink-0 items-center opacity-0 transition-opacity duration-150
                          group-focus-within:opacity-100 group-hover:opacity-100"
                        >
                          <IconButton
                            label="Bring forward"
                            disabled={index === 0}
                            onClick={() => restack(one.id, 1)}
                            className="size-5"
                            draggable={false}
                          >
                            <span className="text-[11px] font-semibold">↑</span>
                          </IconButton>

                          <IconButton
                            label="Send back"
                            disabled={index === draft.elements.length - 1}
                            onClick={() => restack(one.id, -1)}
                            className="size-5"
                            draggable={false}
                          >
                            <span className="text-[11px] font-semibold">↓</span>
                          </IconButton>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs leading-relaxed text-studio-faint">
                    The slide is empty. Add a box with the + above.
                  </p>
                )}

                <p className="text-[10px] leading-snug text-studio-faint">
                  Pick a box to change it. Arrow keys nudge the selection, ⌘C and ⌘V copy it, Delete removes it.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-studio-text uppercase">
                    {KIND_LABELS[element.kind]}
                  </span>

                  <div className="flex items-center gap-0.5">
                    <IconButton label="Send back" onClick={() => restack(element.id, -1)}>
                      <span className="text-[11px] font-semibold">↓</span>
                    </IconButton>

                    <IconButton label="Bring forward" onClick={() => restack(element.id, 1)}>
                      <span className="text-[11px] font-semibold">↑</span>
                    </IconButton>

                    <IconButton label="Duplicate" onClick={() => duplicate(element.id)}>
                      <HiOutlineDuplicate className="text-sm" />
                    </IconButton>

                    <IconButton label="Delete" tone="danger" onClick={() => remove(element.id)}>
                      <HiOutlineTrash className="text-sm" />
                    </IconButton>
                  </div>
                </div>

                {element.kind === 'text' ? (
                  <TextInspector
                    element={element}
                    target={target}
                    fonts={settings.customFonts}
                    armed={armed}
                    holds={holds}
                    patch={change => replace(element.id, change)}
                  />
                ) : element.kind === 'picture' ? (
                  <PictureInspector
                    element={element}
                    pictures={pictures}
                    shelves={shelves}
                    thumbs={thumbs}
                    patch={change => replace(element.id, change)}
                  />
                ) : (
                  <ShapeInspector
                    element={element}
                    pictures={pictures}
                    shelves={shelves}
                    thumbs={thumbs}
                    patch={change => replace(element.id, change)}
                  />
                )}

                <Row label="Align" stack>
                  <div className="flex items-center gap-0.5 rounded-studio border border-studio-border p-0.5">
                    {EDGES.map(({ edge, label, Icon }, index) => (
                      <Fragment key={edge}>
                        {index === 3 ? <span aria-hidden className="mx-0.5 h-4 w-px bg-studio-border" /> : null}

                        <IconButton
                          label={label}
                          onClick={() =>
                            replace(element.id, {
                              frame: alignTo(element.frame, edge),
                            })
                          }
                          className="h-6 flex-1"
                        >
                          <Icon className="size-3.5" />
                        </IconButton>
                      </Fragment>
                    ))}
                  </div>
                </Row>

                <Row label="Turn">
                  <Slider
                    label="Rotation"
                    value={element.rotation}
                    min={-180}
                    max={180}
                    step={1}
                    suffix="°"
                    onChange={rotation => replace(element.id, { rotation })}
                  />
                </Row>

                <Row label="Opacity">
                  <Slider
                    label="Opacity"
                    value={element.opacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={opacity => replace(element.id, { opacity })}
                  />
                </Row>
              </>
            )}
          </aside>
        </div>

        <footer className="flex h-14 shrink-0 items-center justify-between gap-2 border-t border-studio-border px-4">
          <button
            type="button"
            onClick={() => {
              act(() => startingTemplate(target));
              setSelected(null);
            }}
            className="rounded-studio border border-studio-border px-3 py-1.5 text-xs font-medium text-studio-muted
              transition-colors duration-150 hover:border-studio-faint hover:text-studio-text focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            Reset
          </button>

          <div className="flex items-center gap-2">
            {locked ? (
              <p className="mr-1 max-w-64 text-[11px] leading-relaxed text-studio-muted">
                {limitMessage('custom_templates')} Draw all you like here — it just cannot be kept.
              </p>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="rounded-studio px-3 py-1.5 text-xs font-medium text-studio-muted transition-colors
                duration-150 hover:text-studio-text focus:outline-none focus-visible:ring-2
                focus-visible:ring-studio-accent/40"
            >
              Cancel
            </button>

            {locked ? (
              <a
                href="/pricing"
                className="rounded-studio bg-studio-accent px-4 py-1.5 text-xs font-semibold text-studio-onaccent
                  transition-opacity duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2
                  focus-visible:ring-studio-accent/40"
              >
                Get Pro to keep this
              </a>
            ) : (
              <button
                type="button"
                onClick={save}
                className="rounded-studio bg-studio-accent px-4 py-1.5 text-xs font-semibold text-studio-onaccent
                  transition-opacity duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2
                  focus-visible:ring-studio-accent/40"
              >
                Save
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
