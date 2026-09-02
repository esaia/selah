// Projector backgrounds, in the order they are offered.
//
// Addressed by `src` rather than a Tailwind class: the old app had to spell out
// `bg-1img` … `bg-33img` because the scanner cannot see a class name built at
// runtime, which meant the same 33 backgrounds were listed in three places. A
// plain `background-image` needs the list only here.
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
  { id: '1', src: '/images/1.jpeg', label: 'Background 1' },
  { id: '2', src: '/images/2.jpeg', label: 'Background 2' },
  { id: '3', src: '/images/3.jpeg', label: 'Background 3' },
  { id: '4', src: '/images/4.jpeg', label: 'Background 4' },
  { id: '5', src: '/images/5.jpeg', label: 'Background 5' },
  { id: '6', src: '/images/6.jpeg', label: 'Background 6' },
  { id: '7', src: '/images/7.jpeg', label: 'Background 7' },
  { id: '8', src: '/images/8.jpeg', label: 'Background 8' },
  { id: '9', src: '/images/9.jpeg', label: 'Background 9' },
  { id: '10', src: '/images/10.jpeg', label: 'Background 10' },
  { id: '11', src: '/images/11.jpeg', label: 'Background 11' },
  { id: '12', src: '/images/12.jpeg', label: 'Background 12' },
  { id: '13', src: '/images/13.jpeg', label: 'Background 13' },
  { id: '14', src: '/images/14.jpeg', label: 'Background 14' },
  { id: '15', src: '/images/15.jpeg', label: 'Background 15' },
  { id: '16', src: '/images/16.jpeg', label: 'Background 16' },
  { id: '17', src: '/images/17.jpeg', label: 'Background 17' },
  { id: '18', src: '/images/18.jpeg', label: 'Background 18' },
  { id: '19', src: '/images/19.jpeg', label: 'Background 19' },
  { id: '20', src: '/images/20.jpeg', label: 'Background 20' },
];

/** The picture for a stored theme id, falling back to the first background. */
export const themeSrc = (id: string): string => THEMES.find(theme => theme.id === id)?.src ?? THEMES[0].src;

/** A picture fetched from a URL the operator typed. */
export const DYNAMIC_THEME = 'dynamicIMG';

/** The operator's own picture, held on their machine rather than in this list. */
export const LOCAL_THEME = 'localIMG';
