import type { CardIcon } from '@/components/marketing/LinkCard';

import { LANGUAGES_ART, type MarketingArt, OUTPUTS_ART, REMOTE_ART, TIMER_ART } from './art';

export type Solution = {
  slug: string;
  name: string;
  card: string;
  icon: CardIcon;
  title: string;
  description: string;
  headline: [string, string];
  lede: string;
  art: MarketingArt;
  problem: string[];
  points: { title: string; body: string }[];
  steps: string[];
  faq: { q: string; a: string }[];
  useCases: string[];
  related: string[];
};

export const SOLUTIONS: Solution[] = [
  {
    slug: 'small-churches',
    name: 'Small churches',
    card: 'One volunteer, one screen and no budget for a licence per computer.',
    icon: 'small',
    title: 'Free Church Projection Software for Small Churches | LlamaPresenter',
    description:
      'Free church projection software that runs in the browser on the computer you already have: no time limit, '
      + 'nothing to install, and every screen is a link rather than a licence.',
    headline: ['Everything a small church needs,', 'and none of the licence'],
    lede:
      'A church of forty people has the same Sunday as a church of four hundred: a reading, some songs, a screen '
      + 'and somebody willing to run it. What it does not have is a budget for software priced by the computer.',
    art: OUTPUTS_ART,
    problem: [
      'The presentation software costs more per year than the projector did.',
      'It is installed on one laptop, and that laptop belongs to somebody who is sometimes away.',
      'Every extra screen — the foyer TV, the room at the back — is another machine and another licence.',
    ],
    points: [
      {
        title: 'Free church projection software, not a trial',
        body: 'The Bible, both outputs and the stage display are never gated. Pro raises the limits for a church '
          + 'that grows past them, and until then nothing expires.',
      },
      {
        title: 'The computer you already have',
        body: 'A Chromebook, an old MacBook, the machine in the cupboard. If it opens a browser it runs the '
          + 'console.',
      },
      {
        title: 'Screens cost nothing',
        body: 'The projector, the foyer TV and the screen on the platform each open a link. There is no per-screen '
          + 'seat and no video card in between.',
      },
      {
        title: 'One person can run it',
        body: 'Search a verse, click it, and it is on the wall. The phone in your pocket is the remote if you have '
          + 'to be somewhere else.',
      },
    ],
    steps: [
      'Sign in and build Sunday during the week, from anywhere.',
      'Open the projector link on the machine plugged into the screen.',
      'Run the service from the console, or from your phone.',
      'Nothing to install, nothing to update, nothing to renew.',
    ],
    faq: [
      {
        q: 'Is it really free?',
        a: 'Yes, up to a set of limits, and with no time limit on them. The pricing page has the numbers. Pro is '
          + 'for volume rather than for unlocking a Sunday.',
      },
      {
        q: 'What if we only have one computer?',
        a: 'One is enough. The console runs on it and the projector output opens in a second window or on the '
          + 'second display.',
      },
      {
        q: 'Do we need fast internet?',
        a: 'You need a working connection to change what is on the screens. Native Mac and Windows apps are on the '
          + 'way for buildings where that is not a safe bet.',
      },
    ],
    useCases: ['bible-verses-on-screen', 'worship-song-lyrics', 'service-timing'],
    related: ['church-plants', 'volunteer-teams'],
  },
  {
    slug: 'church-plants',
    name: 'Church plants',
    card: 'A borrowed room, a borrowed laptop, and a service on the screen anyway.',
    icon: 'plant',
    title: 'Church Presentation Software for Church Plants | LlamaPresenter',
    description:
      'Set up in a school hall in half an hour with whatever computer is there. Free to start, nothing to install '
      + 'and no licence tied to a machine.',
    headline: ['A school hall,', 'a borrowed laptop'],
    lede:
      'A plant meets where it can, sets up in half an hour and packs away again. Software that has to be installed '
      + 'and licensed on a particular machine is the wrong shape for that week.',
    art: OUTPUTS_ART,
    problem: [
      'The room is different, or the laptop is, or both.',
      'Whatever is installed at home is not installed on the machine in the hall.',
      'The budget for the first year is chairs and a projector, not a subscription per seat.',
    ],
    points: [
      {
        title: 'Whatever computer is there',
        body: 'Sign in and your service is there: the songs, the running order, the templates, all of it.',
      },
      {
        title: 'Free while you are small',
        body: 'The free plan runs a full service and has no countdown on it.',
      },
      {
        title: 'The screen is a link',
        body: 'The hall TV or the projector laptop opens a link. No second install, no second licence.',
      },
      {
        title: 'Nothing to carry',
        body: 'The service lives in your account, not in a folder on the laptop that stayed at home.',
      },
    ],
    steps: [
      'Build the service during the week, from anywhere.',
      'Sign in on whatever computer the room has on Sunday.',
      'Open the projector link on the screen, and the stage link on a second one if you have it.',
      'Pack away. Nothing was installed, so nothing has to be uninstalled.',
    ],
    faq: [
      {
        q: 'What if a different person sets up each week?',
        a: 'They sign in. There is no install to repeat and no licence to move between machines.',
      },
      {
        q: 'Can we use the hall’s own TV?',
        a: 'If it has a browser, or something plugged into it that does, yes. The output is a web page rather than '
          + 'a video signal.',
      },
      {
        q: 'What if the hall has no internet?',
        a: 'That is the honest limit today. Native Mac and Windows apps are being built for exactly that room, and '
          + 'they will run a service with no connection.',
      },
    ],
    useCases: ['bible-verses-on-screen', 'worship-song-lyrics', 'stage-display'],
    related: ['small-churches', 'volunteer-teams'],
  },
  {
    slug: 'bilingual-churches',
    name: 'Bilingual churches',
    card: 'One congregation, two languages, and one set of slides for both.',
    icon: 'languages',
    title: 'Presentation Software for Bilingual Churches | LlamaPresenter',
    description:
      'For congregations that read in two languages: both on the same slide, a different pair on each screen, and '
      + 'any translation you need from a public archive.',
    headline: ['One congregation,', 'two languages'],
    lede:
      'Diaspora and bilingual churches carry a cost nobody else does. The parents read one language, the children '
      + 'read another, and somewhere in the week a volunteer types the second language into every slide.',
    art: LANGUAGES_ART,
    problem: [
      'Two sets of slides for one service, and they drift apart by the third week.',
      'The translation your congregation actually uses is not in the software.',
      'Whoever is on the desk has to decide, mid-service, which language the room gets.',
    ],
    points: [
      {
        title: 'Both languages, one slide',
        body: 'Arm the languages your congregation reads. Every verse you send is drawn in all of them, in the '
          + 'order you set, from one passage read once.',
      },
      {
        title: 'A different pair on each screen',
        body: 'The room can read two while the stream carries one and the platform reads another. It is the same '
          + 'verse, drawn for each screen.',
      },
      {
        title: 'Songs too, out of the box',
        body: 'A song holds the languages it is sung in. They stack on the big screen, and the stage and the lower '
          + 'third each take one.',
      },
      {
        title: 'Your translation exists here',
        body: 'Over a thousand translations from public archives, ticked from inside the console — or upload the '
          + 'file your church has always used.',
      },
    ],
    steps: [
      'Add your languages, in the order they should appear on the wall.',
      'Tell each screen which of them it carries.',
      'Search the passage once. Every language comes out together.',
      'Turn one on or off mid-service without touching a slide.',
    ],
    faq: [
      {
        q: 'Can the sermon be in one language and the wall in two?',
        a: 'Yes. The platform screen, the projector and the stream each choose the languages they carry.',
      },
      {
        q: 'What if our translation is not in your catalogue?',
        a: 'Browse the public archives from inside the console, or upload the file. It then reads exactly like the '
          + 'translations we ship, side by side with them.',
      },
      {
        q: 'Does this work for songs as well as scripture?',
        a: 'Yes. A song carries the languages it is sung in, and they stack the same way a verse does.',
      },
    ],
    useCases: ['multilingual-church-services', 'bible-verses-on-screen', 'worship-song-lyrics'],
    related: ['online-church', 'small-churches'],
  },
  {
    slug: 'multisite-churches',
    name: 'Multisite churches',
    card: 'Two rooms, three screens and one running order that all of them follow.',
    icon: 'multisite',
    title: 'Multi-Screen Worship Software for Multisite Churches | LlamaPresenter',
    description:
      'Multi-screen worship software for the overflow room, the foyer and the second campus: every screen is a '
      + 'link, so an extra room costs nothing and shows the same live slide.',
    headline: ['Another room is', 'another link'],
    lede:
      'The second room is usually solved with a cable, a splitter and somebody who understands both. Here it is '
      + 'solved with a URL: whoever is in that room opens it, and the slide arrives.',
    art: OUTPUTS_ART,
    problem: [
      'The overflow room needs the same slide, and the cable does not reach.',
      'Every additional screen is another licensed machine.',
      'The foyer and the crèche end up on a photo of last week’s notices.',
    ],
    points: [
      {
        title: 'A screen per room, at no cost',
        body: 'Each room opens the projector link on whatever is plugged into its screen. There is no seat to buy '
          + 'and nothing to install.',
      },
      {
        title: 'The same live slide',
        body: 'Every output follows the same session, so the overflow room is never a beat behind the main one.',
      },
      {
        title: 'Rooms can differ where it matters',
        body: 'The languages and the template are set per output, so a room can carry what its congregation reads.',
      },
      {
        title: 'Run it from anywhere in the building',
        body: 'The console is a page. So is the remote. Neither is tied to the machine in the main auditorium.',
      },
    ],
    steps: [
      'Open the projector link in each room that needs the slide.',
      'Set the languages and the look each of them carries.',
      'Run the service once, from the console or a phone.',
      'Add a room mid-service by opening the link on one more screen.',
    ],
    faq: [
      {
        q: 'Is there a limit on the number of screens?',
        a: 'The outputs are links, so a screen is not a seat. What your plan counts is your library and languages, '
          + 'not the rooms you open them in.',
      },
      {
        q: 'Can each room show a different language?',
        a: 'Yes. Every output picks the languages it carries from the same live slide.',
      },
      {
        q: 'Do the rooms need to be in the same building?',
        a: 'No. An output is a link, so a second campus opens it exactly as the room next door does.',
      },
    ],
    useCases: ['multilingual-church-services', 'stage-display', 'church-livestream-graphics'],
    related: ['online-church', 'volunteer-teams'],
  },
  {
    slug: 'online-church',
    name: 'Online church',
    card: 'Verses, lyrics and name cards over the stream, without a capture card.',
    icon: 'online',
    title: 'Church Livestream Lower Thirds and Graphics Software | LlamaPresenter',
    description:
      'Church livestream lower thirds software and scripture graphics for online church: an OBS lower third '
      + 'overlay as a transparent browser source, with its own look and its own language.',
    headline: ['The stream needs its own', 'version of the slide'],
    lede:
      'What works on a projector rarely works on a stream. The text is too big, it sits in the wrong place, and it '
      + 'is often in the wrong language for the people watching.',
    art: OUTPUTS_ART,
    problem: [
      'The wall slide is captured into the stream and looks like a photograph of a wall.',
      'Graphics mean a capture card, a scan converter or an NDI route around the building.',
      'The online congregation reads a different language from the room.',
    ],
    points: [
      {
        title: 'A browser source, not hardware',
        body: 'Paste the stream link into OBS or vMix. Transparent behind, nothing to capture, nothing to install '
          + 'on the streaming machine.',
      },
      {
        title: 'Its own template',
        body: 'The stream carries its own layout, so the text sits where your camera framing wants it.',
      },
      {
        title: 'Its own language',
        body: 'Carry one language online while the room reads two, from the same verse the operator just sent.',
      },
      {
        title: 'Name cards that clear themselves',
        body: 'An OBS lower third overlay for whoever is speaking, fired from the console, counting its own hold '
          + 'down.',
      },
    ],
    steps: [
      'Add the stream output to OBS as a browser source.',
      'Choose the template and the languages it carries.',
      'Run the service. Verses and lyrics appear over the stream.',
      'Fire a name card when somebody new starts speaking.',
    ],
    faq: [
      {
        q: 'Does it work with OBS?',
        a: 'Yes, as a normal browser source with a transparent background. Anything that takes one will take it.',
      },
      {
        q: 'Do we need NDI or a capture card?',
        a: 'No. The output is a web page rather than a video signal, so it travels as a link.',
      },
      {
        q: 'Can we show a different translation online?',
        a: 'Yes. The languages are chosen per output, so the stream and the wall need not agree.',
      },
    ],
    useCases: ['church-livestream-graphics', 'lower-thirds', 'multilingual-church-services'],
    related: ['multisite-churches', 'bilingual-churches'],
  },
  {
    slug: 'worship-teams',
    name: 'Worship teams',
    card: 'What is up, what is next, and how long is left — on the screen the band can see.',
    icon: 'stage',
    title: 'Stage and Lyrics Software for Worship Teams | LlamaPresenter',
    description:
      'Give the band the current block, what is next, the clock and a countdown on a stage screen, while the '
      + 'congregation gets the words and the stream gets its own layout.',
    headline: ['The band should not be', 'reading the wall'],
    lede:
      'A worship team spends the set looking over its shoulder at a screen written for the congregation. The stage '
      + 'view is the same service, drawn for the people running it.',
    art: TIMER_ART,
    problem: [
      'The platform reads the wall backwards, or from a monitor showing the same thing.',
      'Nobody on stage knows what the next song is or how long is left.',
      'A repeat means the operator hunting for a duplicate slide.',
    ],
    points: [
      {
        title: 'Now and next',
        body: 'The current block and the one after it, so the band is never guessing what is coming.',
      },
      {
        title: 'The clock and the countdown',
        body: 'Wall time and the timer for this part of the service, on the same screen.',
      },
      {
        title: 'Blocks, not slides',
        body: 'Verses and choruses are blocks. A repeat is a move rather than a copy of the same slide.',
      },
      {
        title: 'Its own language',
        body: 'The platform can read the language they sing in while the congregation reads two.',
      },
    ],
    steps: [
      'Open the stage link on the screen at the front of the platform.',
      'Build the set as blocks in the song rail.',
      'Send the first block and walk the set with the arrows or a phone.',
      'Start a countdown when the set begins so everyone sees the same number.',
    ],
    faq: [
      {
        q: 'What hardware does the stage screen need?',
        a: 'Anything with a browser: a TV stick, an old laptop, a tablet. It only has to reach the link.',
      },
      {
        q: 'Can the band see notes the congregation does not?',
        a: 'The stage view carries the running order and the timing alongside the words, and the projector carries '
          + 'the words alone.',
      },
      {
        q: 'Can somebody on the platform take over?',
        a: 'Yes. The console opens on a phone, and two people can drive the same session.',
      },
    ],
    useCases: ['stage-display', 'worship-song-lyrics', 'service-timing'],
    related: ['volunteer-teams', 'youth-ministry'],
  },
  {
    slug: 'volunteer-teams',
    name: 'Volunteer teams',
    card: 'Whoever is in the booth signs in. Nothing to install, one version for everybody.',
    icon: 'team',
    title: 'Church Presentation Software for Volunteer Teams | LlamaPresenter',
    description:
      'A rota of volunteers can run the same service from any computer: nothing to install, one version for '
      + 'everyone, and mobile remote control for worship presentation with no app to install.',
    headline: ['A different volunteer', 'every Sunday'],
    lede:
      'The hard part of church tech is rarely the software. It is that the person who knows it is away, and the '
      + 'person covering has never opened it on that machine.',
    art: REMOTE_ART,
    problem: [
      'The rota is four people and the install is on one laptop.',
      'Somebody is a version behind, and the update starts ten minutes before the service.',
      'Handing over mid-service means handing over the chair.',
    ],
    points: [
      {
        title: 'They sign in, not install',
        body: 'Whoever is covering opens the console on whatever computer is in the booth. No install, no licence, '
          + 'no admin password.',
      },
      {
        title: 'One version, everybody',
        body: 'Nobody is a release behind, and there is no update waiting to run before the service.',
      },
      {
        title: 'Two people, one service',
        body: 'A second person opens the same session on their own laptop or phone, and both see the same live '
          + 'slide.',
      },
      {
        title: 'The phone is the remote',
        body: 'Any phone with a browser can drive the service. Nothing to install on it and nothing to pair.',
      },
    ],
    steps: [
      'Invite the volunteer to your church account.',
      'They sign in on the booth computer on the day.',
      'The service, the songs and the templates are already there.',
      'Somebody else picks up a phone and takes over mid-service.',
    ],
    faq: [
      {
        q: 'How many people can be in the account?',
        a: 'The plans have the numbers. What matters here is that a volunteer is a sign-in rather than another '
          + 'install to license.',
      },
      {
        q: 'Can two people run the service at once?',
        a: 'Yes. Both see the same live slide, so handing over is a matter of who picks up the phone.',
      },
      {
        q: 'Does the projector machine need an account?',
        a: 'No. Every output is an unguessable link, and only the person running the console signs in.',
      },
    ],
    useCases: ['stage-display', 'service-timing', 'bible-verses-on-screen'],
    related: ['small-churches', 'worship-teams'],
  },
  {
    slug: 'youth-ministry',
    name: 'Youth and midweek',
    card: 'A TV in a side room, a phone in your hand, and a Bible study on the screen.',
    icon: 'youth',
    title: 'Presentation Software for Youth and Midweek Groups | LlamaPresenter',
    description:
      'Run a youth night or a midweek study from a phone: open the screen link on the room TV, put the passage up '
      + 'and step through it without a laptop at the front.',
    headline: ['A youth night is not', 'a Sunday morning'],
    lede:
      'Midweek is a side room, a television and whoever brought a laptop. Setting up presentation software for '
      + 'forty minutes of Bible study is more work than the study.',
    art: REMOTE_ART,
    problem: [
      'The room has a TV and no booth, and nobody wants to sit behind a laptop.',
      'The passage goes up as a photograph of a page, or not at all.',
      'The person leading is also the person on the keyboard.',
    ],
    points: [
      {
        title: 'The TV opens a link',
        body: 'A stick, a smart TV or a spare laptop opens the projector output. There is nothing to install in a '
          + 'room you use once a week.',
      },
      {
        title: 'Your phone is the console',
        body: 'Search a passage and send it from the phone in your hand, standing where you are teaching.',
      },
      {
        title: 'The same library as Sunday',
        body: 'The songs and templates the church already has are there, so midweek looks like the church rather '
          + 'than like a slideshow.',
      },
      {
        title: 'Two languages, if that is your room',
        body: 'Young people who read one language and parents who read another can both follow the same passage.',
      },
    ],
    steps: [
      'Open the projector link on the room’s TV.',
      'Open the console on your phone.',
      'Search the passage and send it as you teach.',
      'Close the tab when you are done. Nothing was installed in that room.',
    ],
    faq: [
      {
        q: 'Can I run the whole thing from a phone?',
        a: 'Yes. The console is a page, so a phone can search, send and clear without a laptop in the room.',
      },
      {
        q: 'Will it work on a smart TV?',
        a: 'If the TV or the stick plugged into it has a modern browser, it can open the output link.',
      },
      {
        q: 'Do we need a separate account for the youth team?',
        a: 'No. It is the same church account, so the songs and templates are already in it.',
      },
    ],
    useCases: ['bible-verses-on-screen', 'worship-song-lyrics', 'multilingual-church-services'],
    related: ['small-churches', 'worship-teams'],
  },
];

export const findSolution = (slug: string): Solution | undefined =>
  SOLUTIONS.find(item => item.slug === slug);
