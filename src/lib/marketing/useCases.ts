import type { Demo } from '@/components/marketing/ConsoleDemo';
import type { CardIcon } from '@/components/marketing/LinkCard';

import { LANGUAGES_ART, type MarketingArt, OUTPUTS_ART, REMOTE_ART, TEMPLATE_ART, TIMER_ART } from './art';

export type UseCase = {
  slug: string;
  name: string;
  card: string;
  icon: CardIcon;
  title: string;
  description: string;
  headline: [string, string];
  lede: string;
  art: MarketingArt;
  video?: Demo;
  points: { title: string; body: string }[];
  steps: string[];
  faq: { q: string; a: string }[];
  related: string[];
};

export const LIVE_SEARCH_DEMO: Demo = {
  title: 'Search once. Every language updates.',
  teaser:
    'Type a reference and it lands on the live projector at once, stacked in every language you have armed — '
    + 'not a separate step per translation.',
  src: '/videos/live-search-demo.mp4',
  poster: '/videos/live-search-demo-poster.jpg',
  alt: 'Searching 2 Corinthians 7 with English and Ukrainian armed, the verse appearing live on the projector output',
};

export const USE_CASES: UseCase[] = [
  {
    slug: 'multilingual-church-services',
    name: 'Multilingual services',
    card: 'Show multiple languages side by side and choose what each screen displays.',
    icon: 'languages',
    title: 'Dual Language Bible Verse Display Software | LlamaPresenter',
    description:
      'Dual language Bible verse display software for bilingual churches: two or more translations side by side '
      + 'on one slide, songs in every language they are sung in, and a different pair on each screen.',
    headline: ['Multiple Bible languages,', 'on the same slide'],
    lede:
      'A bilingual church usually pays for it twice: once when somebody types the second language into every '
      + 'slide, and again on Sunday when the two sets drift apart. This is side by side scripture on the '
      + 'projector without a second set of slides - a language is something you arm, not something you type.',
    art: LANGUAGES_ART,
    video: {
      title: 'Multiple Bible translations.',
      teaser:
        'Add the Bible versions you need and display them together on the same slide. Switch languages without '
        + 'stopping your service.',
      src: '/videos/custom-language-demo.mp4',
      poster: '/videos/custom-language-demo-poster.jpg',
      alt: 'Adding a translation from the archive inside the console, and picking it in the language picker',
    },
    points: [
      {
        title: 'Show multiple translations together',
        body: 'Send a verse and it is drawn in each language you have on, in the order you set. Nothing is pasted '
          + 'and nothing is duplicated.',
      },
      {
        title: 'Choose languages for each screen',
        body: 'The congregation can read two while the stage carries one and the stream carries the other. It is '
          + 'the same verse, drawn for each screen.',
      },
      {
        title: 'Multilingual lyrics',
        body: 'A song holds the languages it is sung in. They stack on the big screen, and the stage and the lower '
          + 'third each carry one of them.',
      },
      {
        title: 'Add the translations you need',
        body: 'Pick a translation from a public archive inside the console - over a thousand of them - or upload a '
          + 'file of your own.',
      },
    ],
    steps: [
      'Choose the languages your congregation uses and set their order.',
      'Choose which languages appear on the projector, stage, and livestream.',
      'Search for a passage once and show every selected language together.',
      'Turn languages on or off during the service without editing your slides.',
    ],
    faq: [
      {
        q: 'Can I show multiple Bible translations on one slide?',
        a: 'Yes. Two or more translations are drawn on the same slide from one passage read once, which is the '
          + 'part a church usually does by hand in other presentation software.',
      },
      {
        q: 'How many languages can I show at once?',
        a: 'As many as your plan allows and the screen can hold legibly. Two is the common case, and three is '
          + 'workable on a wide projector.',
      },
      {
        q: 'Can the livestream use a different language?',
        a: 'Yes. Each output picks the languages it carries, so the room can read two while the stream carries the '
          + 'one your online congregation needs.',
      },
      {
        q: 'What if our Bible translation is not available?',
        a: 'Browse the public archives from inside the console, or upload the file yourself. It then reads exactly '
          + 'like the translations we ship, side by side with them.',
      },
    ],
    related: ['bible-verses-on-screen', 'worship-song-lyrics', 'church-livestream-graphics'],
  },
  {
    slug: 'bible-verses-on-screen',
    name: 'Bible verses on screen',
    card: 'Find a Bible passage, put it on screen, and move through it one verse at a time.',
    icon: 'book',
    title: 'Put Bible Verses on the Screen at Church | LlamaPresenter',
    description:
      'Search a passage and send it to the projector, the stage and the stream in seconds. Multiple '
      + 'translations, your own layout, and nothing to install.',
    headline: ['Bible verses on screen,', 'in seconds'],
    lede:
      'The reading is announced and the passage has to be up before the second sentence. That is the whole job, '
      + 'and everything here is built around doing it in one search box.',
    art: LANGUAGES_ART,
    points: [
      {
        title: 'Find any Bible passage in seconds',
        body: 'Search by book, chapter, verse, or even a phrase from the passage. Select the reference you need '
          + 'and send it straight to your screen.',
      },
      {
        title: 'Show verses the way you want',
        body: 'Present a verse at a time or display a longer passage across multiple slides. Keep every reading '
          + 'clear and easy to follow.',
      },
      {
        title: 'Match your church style',
        body: 'Choose your font, text size, spacing, background, and other details in the template editor. Your '
          + 'Bible verses will always match the look of your service.',
      },
      {
        title: 'Reliable during your service',
        body: 'Your Bible content is available directly in LlamaPresenter, so you are not waiting for another '
          + 'service to respond during your presentation. Just find your passage and keep going.',
      },
    ],
    steps: [
      'Search the reference in the console.',
      'Click the verse to put it on the screens.',
      'Use the arrows, or your phone, to walk through the passage.',
      'Clear the slide when the reading ends.',
    ],
    faq: [
      {
        q: 'Which translations are included?',
        a: 'The catalogue in the console lists what we hold, and you can add your own from a public archive or '
          + 'from a file. Everything is served from our own database.',
      },
      {
        q: 'Can I show two translations at once?',
        a: 'Yes. Select both translations and the verse appears in each language on the same slide.',
      },
      {
        q: 'Is the Bible part of the free plan?',
        a: 'Yes. Bible verses, projector, stage display, and livestream are available on the Free plan. Pro increases the limits and adds more advanced features.',
      },
    ],
    related: ['multilingual-church-services', 'worship-song-lyrics', 'stage-display'],
  },
  {
    slug: 'worship-song-lyrics',
    name: 'Worship song lyrics',
    card: 'Keep your song library organized, build your running order, and put lyrics on screen when you need them.',
    icon: 'lyrics',
    title: 'Worship Song Lyrics Software for Churches | LlamaPresenter',
    description:
      'Keep your song library online, build the running order for Sunday, and send lyrics to the projector, the '
      + 'stage and the stream. Import an existing ProPresenter library.',
    headline: ['Worship song lyrics,', 'ready when you need them'],
    lede:
      'A song is a running order of its own, and the person on the keys is not the person on the laptop. The '
      + 'library, the order and the blocks are built during the week so Sunday is arrows and nothing else.',
    art: TEMPLATE_ART,
    points: [
      {
        title: 'Import your existing songs',
        body: 'Already have a ProPresenter library? Import your songs into LlamaPresenter and get your lyrics ready '
          + 'without starting from scratch. Your templates handle the design.',
      },
      {
        title: 'Easy song management',
        body: 'Organize verses, choruses, bridges, and repeats with simple blocks. Change the order without '
          + 'rebuilding your slides.',
      },
      {
        title: 'Sing in multiple languages',
        body: 'Show two languages side by side on the main screen and choose the right language for your stage '
          + 'display and livestream.',
      },
      {
        title: 'Lyrics and music in one place',
        body: 'Add your own music tracks and run them with your presentation. No need to switch between different '
          + 'tools during your service.',
      },
    ],
    steps: [
      'Import your existing songs or add new ones to your library.',
      'Build your service running order.',
      'Send the first section and move through the song with the arrows or your phone.',
      'Jump to a repeated section without creating duplicate slides.',
    ],
    faq: [
      {
        q: 'Can I import songs from ProPresenter?',
        a: 'Yes. A ProPresenter 7 document or bundle is read for its lyrics, slide by slide, and turned into songs '
          + 'here.',
      },
      {
        q: 'Do you provide the songs themselves?',
        a: 'No. You bring your own lyrics, and your existing CCLI reporting remains with you.',
      },
      {
        q: 'Can the stage screen show something different from the wall?',
        a: 'Yes. The stage carries the current block and what is next, and can carry a different language from the '
          + 'projector.',
      },
    ],
    related: ['multilingual-church-services', 'stage-display', 'lower-thirds'],
  },
  {
    slug: 'church-livestream-graphics',
    name: 'Livestream graphics',
    card: 'Show Bible verses, lyrics, and lower thirds directly over your church livestream.',
    icon: 'stream',
    title: 'Church Livestream Graphics for OBS | LlamaPresenter',
    description:
      'Put Bible verses, song lyrics and lower thirds over your church livestream with a transparent browser '
      + 'source. No capture card, no NDI, nothing to install on the streaming machine.',
    headline: ['Church livestream graphics,', 'without extra hardware'],
    lede:
      'The stream needs its own version of the slide: smaller, lower, and often in a different language from the '
      + 'wall. It is a link you paste into OBS once, and it stays right for the rest of the service.',
    art: OUTPUTS_ART,
    points: [
      {
        title: 'Simple browser-based setup',
        body: 'Paste the stream link into OBS or vMix as a browser source. There is no capture card and no video '
          + 'feed to route around the building.',
      },
      {
        title: 'Give your livestream its own look',
        body: 'The stream has its own template, so the text can sit where your camera framing wants it rather than '
          + 'where the projector wants it.',
      },
      {
        title: 'Choose the stage language',
        body: 'Show the language your online audience needs while the projector and stage use their own language settings.',
      },
      {
        title: 'Add speaker name cards',
        body: 'Show a speaker\'s name and role with a lower third, then let it disappear automatically.',
      },
    ],
    steps: [
      'Open the livestream output link from the console.',
      'Add it to OBS as a browser source and size it to your canvas.',
      'Choose the language and template for the livestream.',
      'Run your service. The content you send appears over the livestream with a transparent background.',
    ],
    faq: [
      {
        q: 'Does it work with OBS?',
        a: 'Yes. It is a normal browser source with a transparent background, so anything that takes one - OBS, '
          + 'vMix, Ecamm - can take it.',
      },
      {
        q: 'Do I need a capture card or NDI?',
        a: 'No. The stream output is a web page rather than a video signal, so it travels as a link rather than as '
          + 'a feed.',
      },
      {
        q: 'Can the stream show something different from the projector?',
        a: 'Yes. The template and the languages are set per output, so the stream and the wall need not agree on '
          + 'either.',
      },
    ],
    related: ['lower-thirds', 'multilingual-church-services', 'stage-display'],
  },
  {
    slug: 'stage-display',
    name: 'Stage display',
    card: 'Show the current slide, next slide, clock, and timer on a screen your team can see.',
    icon: 'stage',
    title: 'Church Stage Display and Confidence Monitor | LlamaPresenter',
    description:
      'Multi-screen worship software: give the platform a stage view with the current slide, what is next, the '
      + 'running order, a clock and a countdown. It opens on any screen with a browser.',
    headline: ['A church stage display,', 'with everything your team needs'],
    lede:
      'The person preaching needs three things: what is on the wall, what is coming, and how long is left. The '
      + 'stage view is those three, on a screen that costs whatever an old laptop costs.',
    art: TIMER_ART,
    points: [
      {
        title: 'See what is on now and what comes next',
        body: 'Show the current slide and the next one so speakers can stay focused on the service.',
      },
      {
        title: 'Keep an eye on the time',
        body: 'See the current time and the countdown for the service segment in one view.',
      },
      {
        title: 'Open it on any screen',
        body: 'It is a link. Open it on a smart TV, a spare laptop or a tablet - there is no cable to the booth and '
          + 'nothing installed on it.',
      },
      {
        title: 'Choose the stage language',
        body: 'Show the language your team needs while the congregation sees its own language.',
      },
    ],
    steps: [
      'Open the Stage View link on the screen your team uses.',
      'Choose the language and information your team wants to see.',
      'Run the service from the console and Stage View stays in sync.',
      'Start a countdown when a segment begins and your team sees it immediately.',
    ],
    faq: [
      {
        q: 'What hardware does the stage screen need?',
        a: 'Any device with a modern browser can display Stage View, including a smart TV, laptop, or tablet.',
      },
      {
        q: 'Can we have more than one stage screen?',
        a: 'Yes. You can open the Stage View link on multiple screens.',
      },
      {
        q: 'Can the stage screen carry a countdown?',
        a: 'Yes. The church stage display countdown timer sits beside the current slide and what is next, and it '
          + 'has a link of its own for a screen that should show only the clock.',
      },
      {
        q: 'Is there a timer-only screen?',
        a: 'Yes. The timer has its own link for a display that shows only the countdown.',
      },
    ],
    related: ['service-timing', 'worship-song-lyrics', 'lower-thirds'],
  },
  {
    slug: 'service-timing',
    name: 'Service timing',
    card: 'Keep your service on schedule with countdowns, a running order, and clear timing for your team.',
    icon: 'timer',
    title: 'Worship Stage Timer Online | Church Countdown | LlamaPresenter',
    description:
      'A worship stage timer online: countdowns, a running order and a church stage display countdown timer on a '
      + 'screen of its own - part of the same session that runs your verses, lyrics and screens.',
    headline: ['A worship stage timer,', 'that keeps your service on track'],
    lede:
      'Most churches solve timing with a separate timer in a separate tab, run by a separate person. Here the '
      + 'countdown belongs to the same service as the slides, so the person running Sunday is running all of it.',
    art: TIMER_ART,
    points: [
      {
        title: 'A running order with timing',
        body: 'Give each part of your service a planned duration and keep the running order easy to follow.',
      },
      {
        title: 'Show the timer where you need it',
        body: 'The church stage display countdown timer sits beside the slides, and has a link of its own for a '
          + 'screen that shows only the clock.',
      },
      {
        title: 'Adjust the time as you go',
        body: 'Add or remove time while a segment is running. The countdown updates without restarting.',
      },
      {
        title: 'Keep every screen in sync',
        body: 'Your screens stay synchronized with the same service timer.',
      },
    ],
    steps: [
      'Set the planned time for each part of your service.',
      'Start the countdown when the segment begins.',
      'Adjust the time as the service moves.',
      'Let your team follow the same countdown.',
    ],
    faq: [
      {
        q: 'Do we need a separate timer app?',
        a: 'No. The timer is part of the same session as the slides, so the operator does not switch tabs to run '
          + 'it.',
      },
      {
        q: 'Can the team see the timer on its own screen?',
        a: 'Yes. There is a timer-only link you can open on a separate display.',
      },
      {
        q: 'What happens if a screen reloads during a countdown?',
        a: 'It picks the run back up where it is. The countdown is described by when it started, not by a number '
          + 'being pushed to it.',
      },
    ],
    related: ['stage-display', 'lower-thirds', 'bible-verses-on-screen'],
  },
  {
    slug: 'phone-remote-control',
    name: 'Phone remote control',
    card: 'Control your church service from your phone, with nothing to install.',
    icon: 'phone',
    title: 'Mobile Remote Control for Worship Presentation | LlamaPresenter',
    description:
      'A mobile remote control worship presentation app that is not an app: open the console on any phone '
      + 'browser, signed in, and move the service from wherever you are standing.',
    headline: ['Control your service,', 'from your phone'],
    lede:
      'Remote control for worship presentation usually means a companion app, on the same wifi as the machine at '
      + 'the front. Here the console is a page, so a phone that can open it can run the service.',
    art: REMOTE_ART,
    points: [
      {
        title: 'No app to install',
        body: 'Sign in on the phone browser and you have the console: the running order, the search box, the '
          + 'arrows. There is nothing to install and nothing to discover on the network.',
      },
      {
        title: 'Control it from anywhere',
        body: 'Lead from the platform, run the reading from the second row, or fix a slide from the back of the '
          + 'hall. It is the same session either way.',
      },
      {
        title: 'Work together on one service',
        body: 'Use a phone and laptop together. Both devices can control the same live service.',
      },
      {
        title: 'More than a next-slide remote',
        body: 'Verses, songs, the timer and the name cards are all there. A phone remote here is the console, not '
          + 'a next-slide button.',
      },
    ],
    steps: [
      'Open LlamaPresenter on your phone and sign in.',
      'Open the service you want to control.',
      'Search, send, and clear content from your phone.',
      'Hand over control by letting another team member sign in on their device.',
    ],
    faq: [
      {
        q: 'Do I need to install an app?',
        a: 'No. The console is a web page, so any modern phone browser is the remote. There is nothing to install '
          + 'and nothing to pair.',
      },
      {
        q: 'Does the phone need to be on church Wi-Fi?',
        a: 'No. As long as the phone can access LlamaPresenter, you can use it to control the service.',
      },
      {
        q: 'Can two people control the same service?',
        a: 'Yes. Multiple devices can access the same service and stay in sync.',
      },
    ],
    related: ['stage-display', 'service-timing', 'worship-song-lyrics'],
  },
  {
    slug: 'church-slide-templates',
    name: 'Slide templates',
    card: 'Create your church slide design once and use it for every Bible verse and song lyric.',
    icon: 'template',
    title: 'Online Church Slides Editor and Templates | LlamaPresenter',
    description:
      'An online church slides editor for scripture and lyrics: set the typeface, the size, the background and '
      + 'the position once, and every slide the service sends comes out in your own look.',
    headline: ['Church slide templates,', 'create once and use every week'],
    lede:
      'Most presentation software makes you design the slide and then fill it in. The online church slides editor '
      + 'here works the other way: you design the template and the service fills it, so every verse and every '
      + 'lyric arrives in the look you set, on each screen.',
    art: TEMPLATE_ART,
    points: [
      {
        title: 'Design in your browser',
        body: 'Drag the text where it belongs, set the typeface and the size, drop a background behind it. It is '
          + 'the same editor wherever you sign in.',
      },
      {
        title: 'Give each screen its own template',
        body: 'The projector and the stream are different shapes with different problems, so each carries its own '
          + 'template rather than a scaled copy of one.',
      },
      {
        title: 'Use your own fonts',
        body: 'Add a Google font or a link to a woff2 and the pickers carry it. A font you added travels with the '
          + 'slide to every output.',
      },
      {
        title: 'Use one design across your service',
        body: 'Verses, lyrics and name cards all come out of templates, so a change to the look is one change '
          + 'rather than a pass over every slide.',
      },
    ],
    steps: [
      'Open the template editor and design your Bible verse layout.',
      'Create a separate template for your livestream.',
      'Choose a font or add your own.',
      'Run your service and each screen uses its assigned template.',
    ],
    faq: [
      {
        q: 'Do I need to design every slide?',
        a: 'No. You design the template, and the verses and lyrics you send are drawn into it. There are no slides '
          + 'to keep in step with each other.',
      },
      {
        q: 'Can the livestream look different from the projector?',
        a: 'Yes. Each output carries its own template, which is usually the point: a wall and a stream want very '
          + 'different type.',
      },
      {
        q: 'Can we use our own fonts?',
        a: 'Yes. A Google Fonts family or a link to a woff2, woff, ttf or otf file. It travels with the slide, so '
          + 'the outputs draw it too.',
      },
    ],
    related: ['bible-verses-on-screen', 'church-livestream-graphics', 'lower-thirds'],
  },
  {
    slug: 'lower-thirds',
    name: 'Lower thirds',
    card: 'Show speaker names and roles over your livestream, then clear them automatically.',
    icon: 'lower3rd',
    title: 'Church Livestream Lower Thirds Software | LlamaPresenter',
    description:
      'Church livestream lower thirds software: fire a name card over your stream from the console as an OBS '
      + 'lower third overlay. It lays over whatever is showing, holds for as long as you set, and clears itself.',
    headline: ['Church livestream lower thirds,', 'with your own look'],
    lede:
      'A name card is a small thing that looks unprofessional when it is missing and worse when it is left up. '
      + 'It is one click here, and it takes itself down.',
    art: TEMPLATE_ART,
    points: [
      {
        title: 'Keep lower thirds separate',
        body: 'The lower third has its own output, so speaker names appear on the livestream without affecting the projector or stage.',
      },
      {
        title: 'Place it over your livestream',
        body: 'The lower third appears over your existing livestream content, including Bible verses, lyrics, or video.',
      },
      {
        title: 'Clear it automatically',
        body: 'You set the hold. Every screen counts it down for itself, so a card is never left up because a '
          + 'browser tab went quiet.',
      },
      {
        title: 'Match your church style',
        body: 'The card is drawn from your own template, in your own typeface, rather than a stock band across the '
          + 'bottom.',
      },
    ],
    steps: [
      'Open the lower third output and add it to your stream as a browser source.',
      'Enter the speaker\'s name and role in the console.',
      'Show the lower third when they start speaking.',
      'Let it disappear automatically or clear it early.',
    ],
    faq: [
      {
        q: 'How do I add a lower third to an OBS church livestream?',
        a: 'Open the lower third output link and add it to OBS as a browser source, sized to your canvas. It is '
          + 'transparent behind the card, so it sits over your camera.',
      },
      {
        q: 'Will the projector show the lower third?',
        a: 'No. The lower third uses its own output and does not affect the projector or stage.',
      },
      {
        q: 'How long does a lower third stay on screen?',
        a: 'You choose how long it stays on screen.',
      },
      {
        q: 'Can it appear over a Bible verse?',
        a: 'Yes. It can appear over whatever the livestream output is showing.',
      },
    ],
    related: ['church-livestream-graphics', 'worship-song-lyrics', 'stage-display'],
  },
];

export const findUseCase = (slug: string): UseCase | undefined => USE_CASES.find(item => item.slug === slug);