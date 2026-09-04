import { LowerThirdMock } from './LowerThirdMock';
import { SlideMock } from './SlideMock';
import { StageMock } from './StageMock';

/**
 * The three outputs, named and addressed.
 *
 * The hero shows them wired together; this says what each one is and what it is
 * opened at. The paths are the real ones — an output is reached by an
 * unguessable session key, which is the whole reason a projector needs no
 * account — so the address is information, not decoration.
 */
const OUTPUTS = [
  {
    name: 'Projector',
    path: '/show/8f3c…',
    note: 'The verse on the wall, in the languages you armed, on the machine already wired to the beamer.',
    art: <SlideMock />,
  },
  {
    name: 'Lower third',
    path: '/lower3rd/8f3c…',
    note: 'A browser source in OBS, transparent everywhere but the bar: the verse for the people at home, and the speaker’s name when you send one.',
    art: <LowerThirdMock />,
  },
  {
    name: 'Stage',
    path: '/stage/8f3c…',
    note: 'What is up now, what is next, and how long is left — facing the person doing the talking.',
    art: <StageMock />,
  },
];

export const ScreenTiles = () => (
  <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
    {OUTPUTS.map(output => (
      <div key={output.name}>
        <div className="@container overflow-hidden rounded-studio bg-studio-slide ring-1 ring-site-ink/10">
          {output.art}
        </div>
        <h3 className="mt-4 text-base font-medium text-site-ink">{output.name}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-site-muted">{output.note}</p>
        <p className="mt-2 font-mono text-[11px] text-site-faint">{output.path}</p>
      </div>
    ))}
  </div>
);
