import { Tick } from './Tick';

export const BothCover = ({ theirs, items }: { theirs: string; items: string[] }) => (
  <div className="mt-10 rounded-studio-lg border border-site-rule bg-site-bg p-6 sm:p-8">
    <h3 className="font-valera text-xl tracking-tight text-site-ink">What both do</h3>

    <p className="mt-3 max-w-prose text-[16px] leading-relaxed text-site-muted">
      {theirs} covers all of this, and so do we. It is listed here rather than in the table because a row that is a
      yes on both sides is not a reason to choose either one.
    </p>

    <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(item => (
        <li key={item} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-site-muted">
          <Tick className="mt-[6px] size-3.5 shrink-0 text-site-faint" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);
