'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

import { fitText } from '@/lib/projector/fitText';
import { fontStyleOf } from '@/lib/projector/fonts';
import {
  renderBox,
  type Frame,
  type PictureElement,
  type ShapeElement,
  type Gradient,
  type SlideTemplate,
  type TemplateElement,
  type TextElement,
} from '@/lib/projector/template';
import type { ProjectorStyle, ShowData } from '@/lib/types';

export interface SlideStyle {
  order: ProjectorStyle['order'];
  enabled: ProjectorStyle['enabled'];
  versions?: ProjectorStyle['versions'];
  fonts: ProjectorStyle['fonts'];
  lyricsLang?: string;
}

const FRAME_RATIO = 16 / 9;

const MIN_FONT_RATIO = 0.006;

const SHADOW: Record<TextElement['shadow'], string | undefined> = {
  none: undefined,
  soft: '0 1px 6px rgba(0, 0, 0, 0.45)',
  strong: '0 2px 12px rgba(0, 0, 0, 0.5)',
};

const CAPS: Record<TextElement['caps'], CSSProperties['textTransform']> = {
  none: 'none',
  upper: 'uppercase',
  lower: 'lowercase',
};

const VALIGN: Record<TextElement['valign'], CSSProperties['justifyContent']> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
};

const placement = (element: TemplateElement): CSSProperties => ({
  position: 'absolute',
  left: `${element.frame.x * 100}%`,
  top: `${element.frame.y * 100}%`,
  width: `${element.frame.w * 100}%`,
  height: `${element.frame.h * 100}%`,
  opacity: element.opacity,
  transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
});

const gradientCss = (gradient: Gradient) =>
  `linear-gradient(${gradient.angle + 180}deg, ${gradient.from}, ${gradient.to})`;

const plateOf = (element: TextElement): CSSProperties => {
  if (element.plateKind === 'none' || element.plateSpan === 'line') return {};

  if (element.plateKind === 'gradient') return { background: gradientCss(element.plateGradient) };

  return { background: element.plate || undefined };
};

const Bands = ({ element }: { element: TextElement }) => {
  if (element.plateKind === 'none' || element.plateSpan !== 'line') return null;

  const period = element.lineHeight;
  const half = Math.min(element.plateGap, period * 0.8) / 2;
  const stripe =
    `repeating-linear-gradient(to bottom, transparent 0, transparent ${half}em, ` +
    `#000 ${half}em, #000 ${period - half}em, transparent ${period - half}em, transparent ${period}em)`;

  const paint =
    element.plateKind === 'gradient' ? gradientCss(element.plateGradient) : element.plate;

  if (!paint) return null;

  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        background: paint,
        maskImage: stripe,
        WebkitMaskImage: stripe,
      }}
    />
  );
};

const fillOf = (element: ShapeElement, url: string | undefined): CSSProperties => {
  if (element.fillKind === 'none') return {};

  if (element.fillKind === 'color') return { background: element.fill || undefined };

  if (element.fillKind === 'gradient') return { background: gradientCss(element.gradient) };

  return url
    ? {
        backgroundImage: `url(${url})`,
        backgroundSize: element.fit === 'fill' ? '100% 100%' : element.fit,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};
};

const Shape = ({ element, unit, url }: { element: ShapeElement; unit: number; url: string | undefined }) => (
  <div
    aria-hidden
    style={{
      ...placement(element),
      ...fillOf(element, url),
      border:
        element.stroke && element.strokeWidth
          ? `${element.strokeWidth * unit}px solid ${element.stroke}`
          : undefined,
      borderRadius:
        element.kind === 'ellipse' ? '50%' : element.kind === 'line' ? '9999px' : `${element.radius * unit}px`,
    }}
  />
);

const Picture = ({ element, unit, url }: { element: PictureElement; unit: number; url: string | undefined }) =>
  url ? (
    <img
      alt=""
      src={url}
      style={{
        ...placement(element),
        objectFit: element.fit,
        borderRadius: element.radius ? `${element.radius * unit}px` : undefined,
      }}
      className="pointer-events-none select-none"
    />
  ) : null;

const Text = ({
  element,
  frame,
  slot,
  lines,
  unit,
  fonts,
  register,
}: {
  element: TextElement;
  frame: Frame;
  slot: string;
  lines: string[];
  unit: number;
  fonts: ProjectorStyle['fonts'];
  register: (slot: string, node: HTMLDivElement | null) => void;
}) => {
  const type = fontStyleOf(element.font, fonts);
  const padding = element.padding * unit;

  return (
    <div
      style={{
        ...placement({ ...element, frame }),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: VALIGN[element.valign],
        padding,
        ...plateOf(element),
        border:
          element.plateStroke && element.plateStrokeWidth
            ? `${element.plateStrokeWidth * unit}px solid ${element.plateStroke}`
            : undefined,
        borderRadius: element.radius ? `${element.radius * unit}px` : undefined,
        overflow: 'hidden',
      }}
    >
      <div
        ref={node => register(slot, node)}
        className={type.className}
        style={{
          fontFamily: type.style,
          fontSize: `${element.size * unit}px`,
          fontWeight: element.weight,
          fontStyle: element.italic ? 'italic' : 'normal',
          textTransform: CAPS[element.caps],
          color: element.color,
          textAlign: element.align,
          lineHeight: element.lineHeight,
          textShadow: SHADOW[element.shadow],
          position: 'relative',
          isolation: 'isolate',
          ...(element.stroke && element.strokeWidth
            ? {
                WebkitTextStrokeWidth: `${element.strokeWidth * unit}px`,
                WebkitTextStrokeColor: element.stroke,
                paintOrder: 'stroke fill',
              }
            : {}),
        }}
      >
        <Bands element={element} />

        {lines.map((line, index) => (
          <p key={index} dangerouslySetInnerHTML={{ __html: line }} />
        ))}
      </div>
    </div>
  );
};

const useFrame = (ref: RefObject<HTMLDivElement | null>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = ref.current;

    if (!node) return;

    const measure = () => {
      const width = Math.min(node.offsetWidth, node.offsetHeight * FRAME_RATIO);
      const next = { width, height: width / FRAME_RATIO };

      setSize(current => (current.width === next.width && current.height === next.height ? current : next));
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(node);

    return () => observer.disconnect();
  }, [ref]);

  return size;
};

interface Share {
  slot: string;
  frame: Frame;
  lines: string[];
  element: TextElement;
}

const sharesOf = (element: TextElement, groups: string[][]): Share[] => {
  if (element.perLanguage === 'stack' || groups.length < 2) {
    return [{ slot: element.id, frame: element.frame, lines: groups.flat(), element }];
  }

  const { x, y, w, h } = element.frame;
  const gap = element.gap / 100;
  const each = (h - gap * (groups.length - 1)) / groups.length;

  const translated = element.secondary ? { ...element, ...element.secondary } : element;

  return groups.map((lines, index) => ({
    slot: `${element.id}:${index}`,
    frame: { x, y: y + index * (each + gap), w, h: Math.max(each, 0.002) },
    lines,
    element: index === 0 ? element : translated,
  }));
};

export const CustomSlide = ({
  template,
  showData,
  style,
  assets,
}: {
  template: SlideTemplate;
  showData: ShowData;
  style: SlideStyle;
  assets?: Record<string, string>;
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const size = useFrame(boxRef);

  const texts = useRef(new Map<string, HTMLDivElement | null>());

  const register = (slot: string, node: HTMLDivElement | null) => {
    texts.current.set(slot, node);
  };

  const unit = size.height / 100;

  const ctx = {
    showData,
    order: style.order ?? [],
    enabled: style.enabled ?? {},
    versions: style.versions ?? {},
    lyricsLang: style.lyricsLang,
  };

  const drawn = template.elements.flatMap((element): { element: TemplateElement; share: Share | null }[] => {
    if (element.kind !== 'text') return [{ element, share: null }];

    return sharesOf(
      element,
      renderBox(element.content, ctx, element.preserveLineBreaks, element.stripPunctuation),
    ).map(share => ({
      element,
      share,
    }));
  });

  useLayoutEffect(() => {
    const together = new Map<string, HTMLDivElement[]>();

    for (const { element, share } of drawn) {
      if (element.kind !== 'text' || !share) continue;

      const node = texts.current.get(share.slot);
      const max = share.element.size * unit;

      if (!node) continue;

      if (share.element.autoSize === 'fixed') {
        node.style.fontSize = `${max}px`;
        continue;
      }

      const available = share.frame.h * size.height - share.element.padding * unit * 2;
      const floor = Math.max(1, size.height * MIN_FONT_RATIO);

      fitText(node, available, { min: Math.min(floor, max), max });

      if (!element.secondary) together.set(element.id, [...(together.get(element.id) ?? []), node]);
    }

    for (const nodes of together.values()) {
      if (nodes.length < 2) continue;

      const smallest = Math.min(...nodes.map(node => parseFloat(node.style.fontSize) || 0));

      for (const node of nodes) node.style.fontSize = `${smallest}px`;
    }
  });

  return (
    <div ref={boxRef} className="relative flex h-full w-full items-center justify-center">
      <div className="relative" style={{ width: size.width, height: size.height }}>
        {drawn.map(({ element, share }) =>
          element.kind === 'text' && share ? (
            <Text
              key={share.slot}
              element={share.element}
              frame={share.frame}
              slot={share.slot}
              lines={share.lines}
              unit={unit}
              fonts={style.fonts}
              register={register}
            />
          ) : element.kind === 'picture' ? (
            <Picture
              key={element.id}
              element={element}
              unit={unit}
              url={element.file ? assets?.[element.file.id] : undefined}
            />
          ) : element.kind === 'text' ? null : (
            <Shape
              key={element.id}
              element={element}
              unit={unit}
              url={element.file ? assets?.[element.file.id] : undefined}
            />
          ),
        )}
      </div>
    </div>
  );
};
