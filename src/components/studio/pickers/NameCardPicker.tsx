'use client';

import { cn } from '@/lib/cn';
import { TEMPLATES, type Template } from '@/lib/lower3rd/card';

const Preview = ({ template, title, subtitle }: { template: Template; title: string; subtitle: string }) => (
  <div className="nc-preview">
    <div className={`namecard namecard--${template} namecard--in`}>
      <div className="namecard-inner">
        <p className="namecard-title">{title}</p>
        {subtitle ? <p className="namecard-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  </div>
);

export const NameCardPicker = ({
  value,
  onChange,
  title,
  subtitle,
}: {
  value: Template;
  onChange: (template: Template) => void;
  title: string;
  subtitle: string;
}) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
    {TEMPLATES.map(({ value: template, label }) => (
      <button
        key={template}
        type="button"
        aria-pressed={value === template}
        onClick={() => onChange(template)}
        className={cn(
          'group overflow-hidden rounded-studio border text-left transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
          value === template
            ? 'border-studio-accent ring-1 ring-studio-accent'
            : 'border-studio-border hover:border-studio-faint',
        )}
      >
        <Preview template={template} title={title} subtitle={subtitle} />

        <span
          className={cn(
            'block truncate px-1.5 py-1 text-[11px] font-medium',
            value === template ? 'bg-studio-accent text-studio-onaccent' : 'bg-studio-bg text-studio-muted',
          )}
        >
          {label}
        </span>
      </button>
    ))}
  </div>
);
