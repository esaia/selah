import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'LlamaPresenter — everything you need for your next service';

const INK = '#191818';
const CREAM = '#FDF7E8';
const YELLOW = '#FCDF50';

export default async function OpengraphImage() {
  const [valera, icon] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/Varela-Regular.ttf')),
    readFile(join(process.cwd(), 'src/app/icon.svg'), 'utf8'),
  ]);

  const mark = `data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: `linear-gradient(160deg, ${YELLOW}33 0%, #f1ecde 38%, #fbf9f3 100%)`,
          fontFamily: 'Varela Round',
          color: INK,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src={mark} width={72} height={72} alt="" />
          <div style={{ fontSize: 40, letterSpacing: '-0.02em' }}>LlamaPresenter</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 76, lineHeight: 1.28, letterSpacing: '-0.03em' }}>
            <div style={{ display: 'flex' }}>Everything you need</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ display: 'flex' }}>for your&nbsp;</span>
              <span
                style={{
                  display: 'flex',
                  background: YELLOW,
                  borderRadius: 8,
                  padding: '0 16px',
                }}
              >
                next service
              </span>
            </div>
          </div>

          <div style={{ marginTop: 30, fontSize: 30, lineHeight: 1.4, color: '#57524a', maxWidth: 900 }}>
            Bible verses, lyrics and media on your projector, stage display and livestream — from one browser tab.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, color: INK }}>
          {['Projector', 'Stage display', 'Livestream', 'Your phone'].map(item => (
            <div
              key={item}
              style={{
                display: 'flex',
                padding: '10px 22px',
                borderRadius: 999,
                border: '1px solid #e2dbc9',
                background: CREAM,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Varela Round', data: valera, weight: 400, style: 'normal' }],
    },
  );
}
