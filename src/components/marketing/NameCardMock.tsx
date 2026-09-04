import { CHECKER } from './checker';

/**
 * A name card as the stream carries it, drawn with the overlay's own CSS.
 *
 * `.namecard--band` and its siblings are the five finished designs; the class
 * here is the same one an operator's choice writes into the payload, so a
 * redrawn design updates the page it is advertised on.
 */
export const NameCardMock = ({
  name = 'Levan Kiknadze',
  role = 'Guest speaker',
  template = 'band',
  checker,
}: {
  name?: string;
  role?: string;
  template?: string;
  /** Show it the way OBS does — over nothing — rather than over a picture. */
  checker?: boolean;
}) => (
  <div
    className="relative aspect-video overflow-hidden bg-studio-slide"
    // `cqh` needs a container with a known height, which the aspect ratio gives.
    style={{ containerType: 'size', ...(checker ? CHECKER : null) }}
  >
    {checker ? null : (
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: 'url(/images/starts-ends-a.webp)' }}
      />
    )}
    <div className={`namecard nc-site namecard--${template}`}>
      <div className="namecard-inner">
        <p className="namecard-title">{name}</p>
        <p className="namecard-subtitle">{role}</p>
      </div>
    </div>
  </div>
);
