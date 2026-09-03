import { GENERATED_NAMES, GENERATED_VERSIONS } from '@/lib/bible/languageData.generated';

/**
 * Every language the scripture API carries, keyed by the API's own code — so a
 * request needs no translation table, and a language added upstream is one
 * entry here.
 *
 * German is missing on purpose: `holybible.ge` lists it and offers two
 * translations, but every German request comes back in English, so arming it
 * would put English on the projector under a German label. Uncomment it — and
 * regenerate the data file — the day the upstream corpus is real.
 */
export const LANGS = [
  'geo', 'eng', 'ru', 'es', 'fr', 'gr', 'he', 'ae', 'tr', 'la', 'jp', 'ua', 'ab', 'os',
] as const;

export type Lang = (typeof LANGS)[number];

/**
 * English is always in the operator's set and cannot be removed: it is the one
 * language every reader of this console has in common, and the fallback every
 * output lands on when a pick goes away.
 */
export const REQUIRED_LANG: Lang = 'eng';

/** How many languages fit on a slide before it stops being readable. */
export const MAX_LANGS = 3;

export interface LangSpec {
  label: string;
  /**
   * Which book numbering the API expects. Georgian order puts the catholic
   * epistles before the Pauline ones; English does not, and `englishBooks`
   * remaps between them.
   */
  order: 'geo' | 'eng';
  /** Psalm numbering: the Septuagint splits, or the Masoretic ones. */
  psalms: 'lxx' | 'masoretic';
  /**
   * Greek's `bibleNames` carries a stray fourth header before Genesis, so every
   * name in it sits one index later than the book id says.
   */
  nameOffset: 0 | 1;
  /** The upstream `mv` strings, in the order the API lists them. */
  versions: string[];
  /** The translation the language opens on, when it is not the first listed. */
  defaultVersion?: string;
  /** `bibleNames`: three group headers, then the 66 books. */
  names: string[];
}

// Georgian, English and Russian are kept by hand — these arrays were checked
// against the old app, and the tests in `mapping.test.ts` read them. The other
// eleven come straight from the API via `scripts/languages.mjs`.

const versionGeo = [
  'ახალი გადამუშავებული გამოცემა 2015', 'სბს–2013', 'სბს–სტოკჰოლმი 2001', 'საპატრიარქო – orthodoxy.ge',
  'მცხეთური ხელნაწერი–გ. მთაწმინდელი', 'ადიშის ოთხთავი 897 წ. – ძველი მონუსკრიპტები',
  'ახალი ქვეყნიერების თარგმანი*', 'ახალი აღთქმა, სტოკჰოლმი 1985',
];

const versionEng = [
  'NASB New American Standard Bible', 'NIV New International Version', 'KJV King James Version',
  'Geneva Bible 1599', 'NRSV New Revised Standard Bible', 'ESV English Standard Version 2001',
  'Douay Rheims Bible', 'WEB-World English Bible', 'Modern KJV', 'ASV American Standard Version 1901',
  'Basic English Bible', 'Catholic Public Domain Version 2009',
];

const versionRus = [
  'Синодальный перевод', 'Hовый Pусский Перевод (IBS)', 'Библия Германа Менге',
  'Священное Писание - Смысловой Перевод', 'Церковно-славянская Библия Кирилла и Мефодия',
  'Новый Завет - Восстановительный перевод 1998', 'Слово Жизни - Новый Завет 1991',
  'Новый Завет - перевод еписк. Кассиана (Безобразова)',
];

const namesGeo = [
  'ბიბლია', 'ძველი აღთქმა', 'ახალი აღთქმა', 'დაბადება', 'გამოსვლა', 'ლევიანნი', 'რიცხვნი', 'მეორე რჯული',
  'იესო ნავეს ძე', 'მსაჯული', 'რუთი', '1 მეფეთა', '2 მეფეთა', '3 მეფეთა', '4 მეფეთა', '1 ნეშტთა', '2 ნეშტთა',
  'ეზრა', 'ნეემია', 'ესთერი', 'იობი', 'ფსალმუნები', 'იგავნი სოლომონისა', 'ეკლესიასტე',
  'ქებათა-ქება სოლომონისა', 'ესაია', 'იერემია', 'გოდება იერემიასი', 'ეზეკიელი', 'დანიელი', 'ოსია', 'იოველი',
  'ამოსი', 'აბდია', 'იონა', 'მიქა', 'ნაუმი', 'აბაკუმი', 'სოფონია', 'ანგია', 'ზაქარია', 'მალაქია',
  'მათეს სახარება', 'მარკოზის სახარება', 'ლუკას სახარება', 'იოანეს სახარება', 'მოციქულთა საქმეები',
  'იაკობის წერილი', '1 პეტრეს წერილი', '2 პეტრეს წერილი', '1 იოანე', '2 იოანე', '3 იოანე', 'იუდა',
  'რომაელთა მიმართ', '1 კორინთელთა მიმართ', '2 კორინთელთა მიმართ', 'გალატელთა მიმართ', 'ეფესელთა მიმართ',
  'ფილიპელთა მიმართ', 'კოლასელთა მიმართ', '1 თესალონიკელთა მიმართ', '2 თესალონიკელთა მიმართ',
  '1 ტიმოთეს მიმართ', '2 ტიმოთეს მიმართ', 'ტიტეს მიმართ', 'ფილიმონის მიმართ', 'ებრაელთა მიმართ',
  'გამოცხადება',
];

const namesEng = [
  'Bible', 'Old Testament', 'New Testament', 'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habbakuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const namesRus = [
  'Bible', 'Old Testament', 'New Testament', 'Бытие', 'Исход', 'Левит', 'Числа', 'Второзаконие',
  'Иисус Навин', 'Книга Судей', 'Руфь', '1 Царств', '2 Царств', '3 Царств', '4 Царств', '1 Паралипоменон',
  '2 Паралипоменон', 'Книга Ездры', 'Книга Неемии', 'Книга Есфирь', 'Книга Иова', 'Псалтирь', 'Притчи',
  'Екклесиаст', 'Песня Песней', 'Исаия', 'Иеремия', 'Плач Иеремии', 'Иезекииль', 'Даниил', 'Осия', 'Иоиль',
  'Амос', 'Авдий', 'Иона', 'Михей', 'Наум', 'Аввакум', 'Софония', 'Аггей', 'Захария', 'Малахия', 'От Матфея',
  'От Марка', 'От Луки', 'От Иоанна', 'Деяния', 'Иакова', '1 Петра', '2 Петра', '1 Иоанна', '2 Иоанна',
  '3 Иоанна', 'Иуды', 'К Римлянам', '1 Коринфянам', '2 Коринфянам', 'К Галатам', 'К Ефесянам',
  'К Филиппийцам', 'К Колоссянам', '1 Фессалоникийцам', '2 Фессалоникийцам', '1 Тимофею', '2 Тимофею',
  'К Титу', 'К Филимону', 'К Евреям', 'Откровение',
];

/**
 * The two things that vary between languages, and nothing else: which book
 * numbering the API wants, and how the psalms are split. Both were checked
 * against the API itself — `w=48` returns James in Georgian-ordered languages
 * and Romans in English-ordered ones, and Psalm 10 has seven verses under the
 * Septuagint split and eighteen under the Masoretic.
 *
 * Abkhazian and Ossetian are New Testament only; their Old Testament names
 * fall back to Russian upstream and an Old Testament request returns nothing.
 */
export const LANG_SPECS: Record<Lang, LangSpec> = {
  geo: {
    label: 'Georgian',
    order: 'geo',
    psalms: 'lxx',
    nameOffset: 0,
    versions: versionGeo,
    names: namesGeo,
  },
  eng: {
    label: 'English',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 0,
    versions: versionEng,
    defaultVersion: 'KJV King James Version',
    names: namesEng,
  },
  ru: {
    label: 'Russian',
    order: 'geo',
    psalms: 'lxx',
    nameOffset: 0,
    versions: versionRus,
    names: namesRus,
  },
  es: {
    label: 'Spanish',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.es,
    names: GENERATED_NAMES.es,
  },
  fr: {
    label: 'French',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.fr,
    names: GENERATED_NAMES.fr,
  },
  gr: {
    label: 'Greek',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 1,
    versions: GENERATED_VERSIONS.gr,
    names: GENERATED_NAMES.gr,
  },
  he: {
    label: 'Hebrew',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.he,
    names: GENERATED_NAMES.he,
  },
  ae: {
    label: 'Arabic',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.ae,
    names: GENERATED_NAMES.ae,
  },
  tr: {
    label: 'Turkish',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.tr,
    names: GENERATED_NAMES.tr,
  },
  la: {
    label: 'Latin',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.la,
    names: GENERATED_NAMES.la,
  },
  jp: {
    label: 'Japanese',
    order: 'eng',
    psalms: 'masoretic',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.jp,
    names: GENERATED_NAMES.jp,
  },
  ua: {
    label: 'Ukrainian',
    order: 'geo',
    psalms: 'lxx',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.ua,
    names: GENERATED_NAMES.ua,
  },
  ab: {
    label: 'Abkhazian',
    order: 'geo',
    psalms: 'lxx',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.ab,
    names: GENERATED_NAMES.ab,
  },
  os: {
    label: 'Ossetian',
    order: 'geo',
    psalms: 'lxx',
    nameOffset: 0,
    versions: GENERATED_VERSIONS.os,
    names: GENERATED_NAMES.os,
  },
};

export const specOf = (lang: Lang): LangSpec => LANG_SPECS[lang];

export const LANG_LABELS = Object.fromEntries(
  LANGS.map(lang => [lang, LANG_SPECS[lang].label]),
) as Record<Lang, string>;

/** The translations `lang` offers, as options for a picker. */
export const versionsOf = (lang: Lang) =>
  LANG_SPECS[lang].versions.map(version => ({ value: version, label: version }));

/** The translation a language opens on when the operator has not chosen one. */
export const defaultVersionOf = (lang: Lang): string =>
  LANG_SPECS[lang].defaultVersion ?? LANG_SPECS[lang].versions[0] ?? '';

export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);
