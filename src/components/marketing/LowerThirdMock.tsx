import { CHECKER } from './checker';

export const LowerThirdMock = ({ variant = 'split' }: { variant?: string }) => (
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
