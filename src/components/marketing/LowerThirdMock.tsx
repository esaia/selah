import { CHECKER } from './checker';

/**
 * The lower third carrying the live verse, in the split-bar look.
 *
 * `.l3-preview` is the console's own picker tile — a 16:9 box that sizes the
 * bar against its own width — so the page and the picker cannot disagree about
 * what a look looks like, and the markup below is the overlay's, class for
 * class. Only the ground changes: the checker OBS composites against, rather
 * than the picker's stand-in for a camera.
 *
 * One language rather than the projector's stack: a bar that grows past about a
 * third of the frame stops reading as an overlay and starts covering the shot,
 * which is a rule the real output enforces by measuring.
 */
export const LowerThirdMock = ({ variant = 'split' }: { variant?: string }) => (
  // The tile's own gradient stands in for a camera; the checker says the truer
  // thing about this output, which is that everything above the bar is nothing
  // at all. Inline, because `.l3-preview` sets `background` as a shorthand.
  <div className="l3-preview" style={CHECKER}>
    <div className={`lower3rd-bar lower3rd-bar--${variant} font-notosans`}>
      <div className="lower3rd-block">
        <p className="lower3rd-text">
          I am the way, and the truth, and the life. No one comes to the Father except through me.
        </p>

        <div className="lower3rd-refline">
          <span className="lower3rd-ref">
            <span className="lower3rd-ref-book">John</span> <span className="lower3rd-ref-num">14:6</span>
          </span>
        </div>
      </div>
    </div>
  </div>
);
