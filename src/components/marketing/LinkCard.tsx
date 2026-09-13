import Link from 'next/link';

export type CardIcon =
  | 'languages'
  | 'book'
  | 'lyrics'
  | 'stream'
  | 'stage'
  | 'timer'
  | 'lower3rd'
  | 'plant'
  | 'team'
  | 'small'
  | 'multisite'
  | 'youth'
  | 'online'
  | 'events'
  | 'phone'
  | 'template';

const PATHS: Record<CardIcon, string> = {
  languages: 'M4 7h9M8.5 5v2M11 7c0 4-3.5 7-7 7M6 10.5c1.6 2 3.6 3 5.5 3.5M13.5 20l4-9 4 9M15 17.5h5',
  book: 'M5 4.5h6a2 2 0 0 1 2 2V19a2 2 0 0 0-2-1.6H5zM19 4.5h-6a2 2 0 0 0-2 2V19a2 2 0 0 1 2-1.6h6z',
  lyrics: 'M9 18V6.5l10-2V16M9 18a2.2 2.2 0 1 1-4.4 0A2.2 2.2 0 0 1 9 18zM19 16a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0z',
  stream: 'M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 15.5a5 5 0 0 0 0-7M6 6a8.5 8.5 0 0 0 0 12M18 18a8.5 8.5 0 0 0 0-12',
  stage: 'M3.5 5.5h17v11h-17zM9 20h6M12 16.5V20M7 9.5h6M7 12.5h4',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M9.5 3h5',
  lower3rd: 'M3.5 5.5h17v13h-17zM6.5 14.5h8M6.5 17h5',
  plant: 'M12 21v-7M12 14c0-3 2-5.5 5.5-6 0 3.5-2 6-5.5 6zM12 16c0-2.6-1.8-4.8-5-5.2C7 14 8.8 16 12 16zM8 21h8',
  team: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 6.2a3 3 0 0 1 0 5.6M17.5 14.9c2 .7 3.5 2.4 3.5 4.6',
  small: 'M12 3v5M9.5 5.5h5M5 20.5V11l7-4 7 4v9.5M5 20.5h14M10 20.5v-5h4v5',
  multisite: 'M3.5 20.5V9l5-3 5 3v11.5M13.5 20.5V13l4-2.5 3 2v8M2.5 20.5h19M7 12.5h3M7 16h3',
  youth: 'M12 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 8.5v7M8 11.5l4-1 4 1M9.5 20.5 12 15.5l2.5 5',
  online: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.2 9.5h17.6M3.2 14.5h17.6M12 3c-2.4 2.4-3.6 5.4-3.6 9s1.2 6.6 3.6 9c2.4-2.4 3.6-5.4 3.6-9S14.4 5.4 12 3z',
  events: 'M4.5 20.5V8l7.5-4 7.5 4v12.5M2.5 20.5h19M9 20.5v-6h6v6M9.5 10.5h5',
  phone: 'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM10.5 18.5h3M6.5 6h11',
  template: 'M3.5 4.5h17v15h-17zM3.5 9h17M8 9v10.5M11 12h6.5M11 15h4',
};

const Glyph = ({ icon }: { icon: CardIcon }) => (
  <svg viewBox="0 0 24 24" aria-hidden focusable="false" className="size-7">
    <path
      d={PATHS[icon]}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LinkCard = ({
  href,
  name,
  blurb,
  icon,
}: {
  href: string;
  name: string;
  blurb: string;
  icon: CardIcon;
}) => (
  <Link
    href={href}
    className="group flex overflow-hidden rounded-studio-lg border border-site-rule bg-site-surface
      transition-colors duration-150 hover:border-site-ink/25"
  >
    <div className="flex w-16 shrink-0 items-center justify-center bg-site-accent/25 text-site-ink sm:w-20">
      <Glyph icon={icon} />
    </div>

    <div className="p-5 sm:p-6">
      <h3 className="flex items-center gap-2 font-valera text-lg tracking-tight text-site-ink">
        {name}
        <span aria-hidden className="text-site-faint transition-transform group-hover:translate-x-0.5">→</span>
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-site-muted">{blurb}</p>
    </div>
  </Link>
);
