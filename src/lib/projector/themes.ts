export interface Theme {
  id: string;
  src: string;
  label: string;
}

export const THEMES: Theme[] = [
  { id: '21', src: '/images/the-crown.webp', label: 'The Crown' },
  { id: '22', src: '/images/kingdom-crown.webp', label: 'Kingdom Come — Crown' },
  { id: '23', src: '/images/kingdom-cross.webp', label: 'Kingdom Come — Cross' },
  { id: '24', src: '/images/kingdom-dove.webp', label: 'Kingdom Come — Dove' },
  { id: '25', src: '/images/kingdom-hands.webp', label: 'Kingdom Come — Hands' },
  { id: '26', src: '/images/kingdom-communion.webp', label: 'Kingdom Come — Communion' },
  { id: '27', src: '/images/jesus-saves.webp', label: 'Jesus Saves' },
  { id: '28', src: '/images/kingdom-come-b.webp', label: 'Kingdom Come II' },
  { id: '29', src: '/images/kingdom-come-c.webp', label: 'Kingdom Come III' },
  { id: '30', src: '/images/fragrance-a.webp', label: 'Fragrance I' },
  { id: '31', src: '/images/fragrance-b.webp', label: 'Fragrance II' },
  { id: '32', src: '/images/isaiah-52-a.webp', label: 'Isaiah 52-53 I' },
  { id: '33', src: '/images/isaiah-52-b.webp', label: 'Isaiah 52-53 II' },
  { id: '34', src: '/images/starts-ends-a.webp', label: 'Starts & Ends I' },
  { id: '35', src: '/images/starts-ends-b.webp', label: 'Starts & Ends II' },
  { id: '36', src: '/images/starts-ends-c.webp', label: 'Starts & Ends III' },
  { id: '1', src: '/images/1.webp', label: 'Background 1' },
  { id: '2', src: '/images/2.webp', label: 'Background 2' },
  { id: '3', src: '/images/3.webp', label: 'Background 3' },
  { id: '4', src: '/images/4.webp', label: 'Background 4' },
  { id: '5', src: '/images/5.webp', label: 'Background 5' },
  { id: '6', src: '/images/6.webp', label: 'Background 6' },
  { id: '7', src: '/images/7.webp', label: 'Background 7' },
  { id: '8', src: '/images/8.webp', label: 'Background 8' },
  { id: '9', src: '/images/9.webp', label: 'Background 9' },
  { id: '10', src: '/images/10.webp', label: 'Background 10' },
  { id: '11', src: '/images/11.webp', label: 'Background 11' },
  { id: '12', src: '/images/12.webp', label: 'Background 12' },
  { id: '13', src: '/images/13.webp', label: 'Background 13' },
  { id: '14', src: '/images/14.webp', label: 'Background 14' },
  { id: '15', src: '/images/15.webp', label: 'Background 15' },
  { id: '16', src: '/images/16.webp', label: 'Background 16' },
  { id: '17', src: '/images/17.webp', label: 'Background 17' },
  { id: '18', src: '/images/18.webp', label: 'Background 18' },
  { id: '19', src: '/images/19.webp', label: 'Background 19' },
  { id: '20', src: '/images/20.webp', label: 'Background 20' },
];

export const DEFAULT_THEME = '31';

export const themeSrc = (id: string): string =>
  THEMES.find(theme => theme.id === id)?.src ?? themeSrcOf(DEFAULT_THEME);

const themeSrcOf = (id: string) => THEMES.find(theme => theme.id === id)?.src ?? THEMES[0].src;

export const DYNAMIC_THEME = 'dynamicIMG';

export const LOCAL_THEME = 'localIMG';
