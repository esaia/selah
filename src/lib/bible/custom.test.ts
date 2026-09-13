import { describe, expect, it } from 'vitest';

import {
  asCustomTranslations,
  customLangsOf,
  langSpecsOf,
  customIdOf,
  findCustomVersion,
  isKnownVersion,
  psalmSchemeOf,
  versionLabel,
  versionOptions,
  versionValueOf,
  type CustomTranslation,
} from './custom';

const ours: CustomTranslation = { id: 'a1', lang: 'eng', label: 'Our own revision', psalms: 'masoretic' };
const russian: CustomTranslation = { id: 'b2', lang: 'ru', label: 'Новый перевод', psalms: 'masoretic' };
const customs = [ours, russian];

describe('a stored version string', () => {
  it('is the catalogue’s own name when it is one of ours', () => {
    expect(customIdOf('KJV King James Version')).toBeNull();
    expect(versionLabel('eng', 'KJV King James Version', customs)).toBe('KJV King James Version');
  });

  it('carries the id of an uploaded translation', () => {
    expect(versionValueOf(ours)).toBe('custom:a1');
    expect(customIdOf('custom:a1')).toBe('a1');
    expect(findCustomVersion('custom:a1', customs)).toBe(ours);
  });
});

describe('what the operator can read a language in', () => {
  it('is the catalogue, then their own, for that language alone', () => {
    const options = versionOptions('eng', customs);

    expect(options[0].value).toBe('WEB-World English Bible');
    expect(options.at(-1)).toEqual({ value: 'custom:a1', label: 'Our own revision' });
    expect(options.some(option => option.value === 'custom:b2')).toBe(false);
  });
});

describe('a pick that no longer exists', () => {
  it('is not kept', () => {
    expect(isKnownVersion('eng', 'custom:a1', customs)).toBe(true);
    expect(isKnownVersion('eng', 'custom:gone', customs)).toBe(false);
    expect(isKnownVersion('eng', 'KJV King James Version', customs)).toBe(true);
  });

  it('is not another language’s, either', () => {
    expect(isKnownVersion('eng', 'custom:b2', customs)).toBe(false);
  });

  it('falls back to a name rather than printing an id', () => {
    expect(versionLabel('eng', 'custom:gone', customs)).toBe('WEB-World English Bible');
    expect(versionLabel('eng', 'custom:a1', customs)).toBe('Our own revision');
    expect(versionLabel('eng', undefined, customs)).toBe('');
  });
});

describe('psalms', () => {
  it('follow the language when it is read in one of ours', () => {
    expect(psalmSchemeOf('ru', 'Синодальный перевод', customs)).toBe('lxx');
    expect(psalmSchemeOf('eng', 'KJV King James Version', customs)).toBe('masoretic');
  });

  it('follow the upload when it disagrees with the language', () => {
    expect(psalmSchemeOf('ru', 'custom:b2', customs)).toBe('masoretic');
  });

  it('fall back to the language when the upload is gone', () => {
    expect(psalmSchemeOf('ru', 'custom:gone', customs)).toBe('lxx');
  });
});

describe('reading the rows back', () => {
  it('keeps what is whole and drops what is not', () => {
    expect(
      asCustomTranslations([
        { id: 'a1', lang: 'eng', label: 'Ours', psalms: 'lxx' },
        { id: 'b2', lang: 'klingon', label: 'No such language', psalms: 'lxx' },
        { id: 'c3', lang: 'eng' },
        'nonsense',
      ]),
    ).toEqual([{ id: 'a1', lang: 'eng', label: 'Ours', psalms: 'lxx' }]);
  });

  it('defaults an unreadable psalm scheme to the commoner one', () => {
    expect(asCustomTranslations([{ id: 'a1', lang: 'eng', label: 'Ours' }])[0].psalms).toBe('masoretic');
  });

  it('reads nothing out of nothing', () => {
    expect(asCustomTranslations(null)).toEqual([]);
  });
});

describe('a language the operator brought', () => {
  const spanish: CustomTranslation = {
    id: 'c3',
    lang: 'x:c3',
    label: 'Reina-Valera 1909',
    psalms: 'masoretic',
    langLabel: 'Español',
    bookNames: ['Biblia', 'Antiguo', 'Nuevo', ...Array.from({ length: 66 }, (_, i) => `Libro ${i + 1}`)],
  };

  const withSpanish = [...customs, spanish];

  it('becomes a language of its own, named and with its own books', () => {
    const specs = langSpecsOf(withSpanish);

    expect(specs['x:c3'].label).toBe('Español');
    expect(specs['x:c3'].names).toHaveLength(69);
    expect(specs['x:c3'].names[3]).toBe('Libro 1');
    expect(specs['x:c3'].versions).toEqual(['custom:c3']);
  });

  it('is always canonical order', () => {
    expect(langSpecsOf(withSpanish)['x:c3'].order).toBe('eng');
  });

  it('is offered as somewhere a second Bible can go', () => {
    expect(customLangsOf(withSpanish)).toEqual([{ code: 'x:c3', label: 'Español' }]);
  });

  it('takes its names from whichever of its translations carried any', () => {
    const bare: CustomTranslation = { id: 'c4', lang: 'x:c3', label: 'Another', psalms: 'masoretic' };
    const specs = langSpecsOf([bare, spanish]);

    expect(specs['x:c3'].names[3]).toBe('Libro 1');
    expect(specs['x:c3'].versions).toEqual(['custom:c4', 'custom:c3']);
  });

  it('falls back to English book names when no file named them', () => {
    const bare: CustomTranslation = { id: 'c4', lang: 'x:c4', label: 'Another', psalms: 'masoretic' };

    expect(langSpecsOf([bare])['x:c4'].names[3]).toBe('Genesis');
  });

  it('offers only its own translations, never the catalogue’s', () => {
    expect(versionOptions('x:c3', withSpanish)).toEqual([{ value: 'custom:c3', label: 'Reina-Valera 1909' }]);
    expect(isKnownVersion('x:c3', 'KJV King James Version', withSpanish)).toBe(false);
    expect(isKnownVersion('x:c3', 'custom:c3', withSpanish)).toBe(true);
  });

  it('reads the row’s own spelling of the two extra columns', () => {
    const [read] = asCustomTranslations([
      {
        id: 'c3',
        lang: 'x:c3',
        label: 'Reina-Valera 1909',
        psalms: 'masoretic',
        lang_label: 'Español',
        book_names: spanish.bookNames,
      },
    ]);

    expect(read.langLabel).toBe('Español');
    expect(read.bookNames?.[3]).toBe('Libro 1');
  });

  it('ignores a book-name list that is not the right length', () => {
    const [read] = asCustomTranslations([
      { id: 'c3', lang: 'x:c3', label: 'x', psalms: 'lxx', book_names: ['too', 'short'] },
    ]);

    expect(read.bookNames).toBeUndefined();
  });
});
