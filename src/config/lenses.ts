/**
 * The lens library.
 *
 * Every lens type the store fits has one entry here, and that entry is the only
 * source for the header menu, the /lenses index and the /lenses/[slug] detail
 * page. Adding a lens type is a single object  no new route file, no second
 * copy of the copy in the mega-menu block.
 *
 * The optical copy is written from published sources rather than from supplier
 * marketing, which is why several entries carry a `goodToKnow` line that cuts
 * against the sale (photochromics behind a windscreen, the Cochrane finding on
 * blue-light filtering, polarised lenses against an LCD dashboard). A lens page
 * that only lists benefits is the one customers come back to argue with.
 */

export type LensGroup =
  | "Clear & coated"
  | "Screen & indoor"
  | "Sun & outdoor"
  | "Multifocal"
  | "Premium ranges";

/** A colour or sub-option offered within one lens type. */
export type LensVariant = {
  name: string;
  /** Swatch fill  drawn as the lens tint, so keep it the tint, not the frame. */
  hex: string;
  summary: string;
};

export type LensType = {
  slug: string;
  /** Menu and page title. */
  name: string;
  /** Short label for tight spots such as the comparison table. */
  shortName: string;
  group: LensGroup;
  /** One line under the title and on the card. */
  tagline: string;
  /** lucide-react icon name  see `LENS_ICONS` in the lens components. */
  icon: string;
  image: string;
  imageAlt: string;
  /**
   * A second, human photograph of the lens in the situation it is for.
   * The detail page pairs it with "How it works" so the page carries a
   * product shot and a context shot rather than one image and a lot of boxes.
   */
  imageInUse: string;
  imageInUseAlt: string;
  /** Opening paragraphs. */
  intro: string[];
  howItWorks: string[];
  benefits: { title: string; body: string }[];
  bestFor: string[];
  /** Honest limitations. Never leave this empty. */
  goodToKnow: string[];
  variants?: { title: string; description: string; items: LensVariant[] };
  specs: { label: string; value: string }[];
  faqs: { question: string; answer: string[] }[];
  /** Slugs of the lens types worth comparing this one against. */
  compareWith: string[];
  /**
   * Set when the entry describes a supplier range whose exact specification is
   * confirmed in store rather than published. The page draws a note instead of
   * stating figures the site cannot stand behind.
   */
  supplierRange?: boolean;
};

const IMG = "/images/lenses";

export const lensTypes: LensType[] = [
  /* ------------------------------------------------------------ uncoated */
  {
    slug: "uncoated",
    name: "U/C (Uncoated) Lenses",
    shortName: "Uncoated (U/C)",
    group: "Clear & coated",
    tagline:
      "The plain, untreated prescription lens  the most affordable way to get your power made up.",
    icon: "circle",
    image: `${IMG}/uncoated.jpg`,
    imageAlt:
      "A pair of clear uncoated prescription lenses beside a slim gold spectacle frame",
    imageInUse: `${IMG}/uncoated-use.jpg`,
    imageInUseAlt:
      "A customer trying on a pair of clear everyday spectacles at the dispensing counter",
    intro: [
      "U/C stands for uncoated: a prescription lens finished with nothing added to its surface  no anti-reflective layer, no blue filter, no tint. It is the lens in its simplest form, and it is where most price lists start.",
      "An uncoated lens corrects your prescription exactly as well as a coated one. The difference is not in the power, it is in what happens at the surface of the lens when light hits it.",
    ],
    howItWorks: [
      "Every time light crosses from air into a lens, a small percentage of it bounces off instead of passing through. On an untreated lens that adds up: an uncoated lens transmits roughly 92% of the light reaching it, while the same lens with an anti-reflective coating transmits 98–99%.",
      "The light that does not pass through has to go somewhere, and it comes back at you as surface reflections  the halos around headlights at night, the bright wash across your lenses in a photograph, and the ghost image of a screen sitting over what you are actually reading.",
      "That is the whole trade. You save the cost of the coating, and you accept the reflections that the coating would have removed.",
    ],
    benefits: [
      {
        title: "The lowest price on the board",
        body: "No surface treatments means no surcharge. For a first pair, a spare pair, or a child who will outgrow the frame in a year, that money is often better spent on the frame.",
      },
      {
        title: "Scratches show up less",
        body: "A scratch across an anti-reflective coating catches light and stands out. The same scratch on an uncoated surface is far harder to notice, which is why uncoated lenses often look acceptable for longer in rough daily use.",
      },
      {
        title: "Simple to clean",
        body: "There is no coating layer to damage, so smudges and dust wipe away without the care an AR surface needs. A microfibre cloth and lens spray are still the right tools.",
      },
      {
        title: "Completely neutral colour",
        body: "Nothing is filtering or tinting what you see. Colours come through exactly as they are, which matters if you paint, print, match fabric, or grade photographs.",
      },
    ],
    bestFor: [
      "A first pair of glasses on a tight budget",
      "A spare pair kept in the car, the office drawer or the toolbox",
      "Children's glasses that get replaced often",
      "Low prescriptions worn only occasionally, in good light",
      "Work where colour has to be judged with nothing in the way",
    ],
    goodToKnow: [
      "Night driving is where uncoated lenses are felt most  oncoming headlights throw noticeable halos and reflections that an anti-reflective coating largely removes.",
      "On video calls and in photographs, your lenses will show a bright reflection and your eyes will be harder to see.",
      "Uncoated does not mean unprotected from UV. UV blocking comes from the lens material and any UV treatment, not from the coating  ask us to confirm the UV rating on the material you choose.",
      "If you spend hours in front of a screen, the reflections are the thing that will tire you, and an anti-reflective or blue filter lens is the honest recommendation.",
    ],
    specs: [
      { label: "Coating", value: "None" },
      { label: "Light transmission", value: "≈92%" },
      { label: "Tint", value: "Clear" },
      { label: "Typical use", value: "Everyday, budget and spare pairs" },
      { label: "Available as", value: "Single vision, bifocal, progressive" },
    ],
    faqs: [
      {
        question: "Will uncoated lenses give me weaker vision?",
        answer: [
          "No. The prescription is ground into the lens itself, so an uncoated lens corrects your sight exactly as accurately as a coated one.",
          "What you notice instead is contrast in difficult light  night driving, a bright screen in a dim room, headlights in the rain  where surface reflections sit over the image.",
        ],
      },
      {
        question: "Can a coating be added to my lenses later?",
        answer: [
          "Not practically. Anti-reflective and blue filter layers are applied to the lens during manufacture in a vacuum coating chamber, not afterwards at the counter.",
          "If you decide you want a coating, a new pair of lenses is made and fitted into your existing frame  which we are happy to do.",
        ],
      },
      {
        question: "How do I look after them?",
        answer: [
          "Rinse dust off under running water before you wipe, use a lens spray and a clean microfibre cloth, and never use a shirt, tissue or kitchen paper  those are what put the fine scratches into a lens.",
          "Store them in a case face-up, never lens-down on a table.",
        ],
      },
    ],
    compareWith: ["blue-cut", "blue-filter"],
  },

  /* ------------------------------------------------------------ blue cut */
  {
    slug: "blue-cut",
    name: "Blue Cut Lenses",
    shortName: "Blue Cut",
    group: "Screen & indoor",
    tagline:
      "A stronger filter on the high-energy violet-blue band, built for long days on a screen.",
    icon: "monitor",
    image: `${IMG}/blue-cut.jpg`,
    imageAlt:
      "A clear eyeglass lens showing a violet-blue coating reflection in front of a glowing laptop screen",
    imageInUse: `${IMG}/blue-cut-use.jpg`,
    imageInUseAlt:
      "A woman working late at a laptop, her clear lenses catching the light of the screen",
    intro: [
      "A blue cut lens is a clear prescription lens with a filter that removes a share of the short-wavelength violet-blue light  roughly the 400–450 nm band  that comes off phone, laptop and LED screens.",
      "It is the most-asked-for lens in the shop, and it is worth understanding exactly what it does and what it does not do before you buy it.",
    ],
    howItWorks: [
      "The filter is either built into the lens material or applied as a coating on the surface. Either way it attenuates part of the violet-blue band while letting the rest of the visible spectrum through.",
      "Blue cut lenses typically filter 30–40% or more of the light in the 400–450 nm range. That is the aggressive end of blue-light filtering, which is why the lens usually carries a faint yellow cast and shows a distinct violet-blue sheen when light catches it.",
      "Almost every blue cut lens we fit also carries a full anti-reflective and hard coating, because a screen lens without an anti-reflective layer would put the reflection of the screen straight back at you.",
    ],
    benefits: [
      {
        title: "The strongest blue filtering we stock",
        body: "If you want the highest blue-violet attenuation available in a clear lens, this is it  noticeably more than a blue filter or blue control lens.",
      },
      {
        title: "Anti-reflective as standard",
        body: "Reflections off the front and back of the lens are what actually make a long screen day uncomfortable. The AR layer that comes with a blue cut lens removes almost all of them.",
      },
      {
        title: "Calmer under LED and fluorescent light",
        body: "Open-plan offices and classrooms run on cool LED and fluorescent lighting. Taking the top off the violet-blue makes that light noticeably less harsh over a full day.",
      },
      {
        title: "Cleaner on camera",
        body: "The anti-reflective layer keeps your eyes visible on video calls instead of hidden behind two bright rectangles.",
      },
    ],
    bestFor: [
      "Eight-hour screen days  developers, accountants, call centres, editors",
      "Students working late on laptops and phones",
      "Anyone who already finds LED lighting harsh",
      "People upgrading from an uncoated lens who want everything in one go",
    ],
    goodToKnow: [
      "The evidence is not on the marketing's side. A 2023 Cochrane review of 17 randomised trials concluded that blue-light filtering spectacle lenses probably make no difference to eye strain from computer use or to sleep quality, and found no evidence that they protect the retina.",
      "Much of the comfort wearers genuinely report comes from the anti-reflective coating that ships with the lens, not from the blue filter itself  which is a real benefit, just not the one on the label.",
      "The faint yellow cast is visible in white backgrounds and skin tones. If you match colour for a living, choose a blue filter lens or a plain AR lens instead.",
      "It is not a substitute for taking breaks. The 20-20-20 habit  every 20 minutes, look at something 20 feet away for 20 seconds  does more for tired eyes than any lens.",
    ],
    specs: [
      { label: "Filtering", value: "≈30–40%+ across 400–450 nm" },
      { label: "Appearance", value: "Clear with a faint yellow cast" },
      { label: "Coating", value: "Anti-reflective + hard coat included" },
      { label: "Typical use", value: "Screens, office and study" },
      { label: "Available as", value: "Single vision, bifocal, progressive" },
    ],
    faqs: [
      {
        question: "Blue cut or blue filter  what is the real difference?",
        answer: [
          "Blue cut filters harder: 30–40% or more of the 400–450 nm band, with a faint yellow cast to show for it.",
          "Blue filter (also sold as blue control) is gentler  around 20–30% of the most energetic blue-violet  and lets the beneficial blue-turquoise through, so colours stay closer to natural.",
          "Heavy screen users who want maximum filtering choose blue cut. People who want the comfort without the colour shift choose blue filter.",
        ],
      },
      {
        question: "Do I need a prescription for blue cut lenses?",
        answer: [
          "No. Blue cut can be made in plano  zero power  so you can have the filter and the anti-reflective coating without any correction.",
          "If you do have a prescription, the filter is simply made into your power at no change to the fitting.",
        ],
      },
      {
        question: "Will blue cut lenses help me sleep better?",
        answer: [
          "We would not sell them to you on that basis. The Cochrane review found no reliable improvement in sleep quality from blue-light filtering lenses.",
          "If evening screen use is disturbing your sleep, your device's own night mode and putting the phone down an hour before bed are the changes with evidence behind them.",
        ],
      },
    ],
    compareWith: ["blue-filter", "uncoated", "photochromic"],
  },

  /* --------------------------------------------------------- photochromic */
  {
    slug: "photochromic",
    name: "Photochromic Lenses",
    shortName: "Photochromic",
    group: "Sun & outdoor",
    tagline:
      "Clear indoors, dark in the sun  one pair of glasses that handles both, in six tint colours.",
    icon: "sun",
    image: `${IMG}/photochromic.jpg`,
    imageAlt:
      "Spectacles with one clear lens and one darkened lens showing a photochromic tint mid-transition",
    imageInUse: `${IMG}/photochromic-use.jpg`,
    imageInUseAlt:
      "A woman stepping out of shade into bright sunlight, her lenses visibly darkened",
    intro: [
      "Photochromic lenses darken automatically in sunlight and fade back to clear indoors. You wear one pair, walk out of the office into Colombo sun, and the lens handles it without you swapping glasses or hunting for clip-ons.",
      "We supply them in six tints  grey, green, blue, yellow, purple and pink  so the darkened state can be chosen for how you want to see, and for how you want to look.",
    ],
    howItWorks: [
      "The lens carries photochromic molecules that change shape when they absorb ultraviolet radiation. In plastic lenses these are carbon-based photochromic dyes; in glass lenses they are silver halide crystals, usually silver chloride, which gain an electron under UV and become metallic silver that absorbs light.",
      "Either way the reaction is the same to wear: step into sunlight and the lens begins darkening within seconds, reaching full tint in roughly 30 to 90 seconds. Step back into shade and the molecules relax to their original state and the lens clears again.",
      "The cycle is fully reversible and repeats thousands of times over the life of the lens. Nothing wears out from using it  the tint gradually becomes less deep only over years of service.",
    ],
    benefits: [
      {
        title: "One pair, indoors and out",
        body: "No second pair of prescription sunglasses to buy, carry, lose or leave in the other bag. This is the reason most people choose them.",
      },
      {
        title: "Full UV block, all day",
        body: "Photochromic lenses block UV in both states  clear indoors and dark outside  so your eyes are covered even before the tint has finished arriving.",
      },
      {
        title: "It adjusts faster than you do",
        body: "Walking from a dim corridor into hard midday glare, the lens is already darkening while your own pupils are still catching up.",
      },
      {
        title: "Six tints to choose from",
        body: "Grey for true colour, green for contrast, and four fashion tints  the darkened state is a style decision as much as an optical one.",
      },
    ],
    bestFor: [
      "Anyone who moves in and out of sunlight all day",
      "People who dislike carrying and swapping a second pair",
      "Light-sensitive eyes that find bright days uncomfortable",
      "Children and teenagers who will not remember sunglasses",
      "Sri Lanka's glare  an everyday lens rather than a holiday one",
    ],
    goodToKnow: [
      "They will not darken properly inside a car. Modern windscreens block 98–99% of UV, and UV is what triggers the reaction. If you want tint behind the wheel, ask us about an extra-active photochromic that also responds to visible light, or fit polarised sunglasses for driving.",
      "Temperature changes the behaviour. The lens darkens deeper and faster in cool conditions and fades back to clear faster in heat, so a hot Colombo afternoon gives a slightly lighter tint than a cool morning.",
      "Fading back to clear takes longer than darkening  expect a few minutes indoors before the last of the tint has gone.",
      "A photochromic lens at full tint is not as dark as a dedicated pair of sunglasses. For a full day at the beach or on the water, polarised sunglasses are still the better tool.",
    ],
    variants: {
      title: "Six photochromic tints",
      description:
        "Every tint clears to the same near-transparent lens indoors. The colour is what you get when the lens is fully darkened outside.",
      items: [
        {
          name: "Grey",
          hex: "#5A5A5A",
          summary:
            "The neutral choice. Cuts brightness across the whole spectrum without shifting colours, so traffic lights, skin tones and signage all look as they should. The safest all-rounder and the best pick for driving once out of the car.",
        },
        {
          name: "Green",
          hex: "#4A6B4C",
          summary:
            "Lifts contrast while staying close to natural colour. Good in variable light  dappled shade, overcast bright days  and easy on the eyes over long outdoor stretches.",
        },
        {
          name: "Blue",
          hex: "#3C5A8A",
          summary:
            "A cool, modern look with a soft, even reduction in brightness. Chosen mostly for style; comfortable in bright, hazy conditions.",
        },
        {
          name: "Yellow",
          hex: "#C9A227",
          summary:
            "The contrast tint. Brightens dull, overcast and low-light conditions and sharpens the edges of moving objects, which is why it is popular with sports wearers. Shifts colour noticeably.",
        },
        {
          name: "Purple",
          hex: "#6B4E8C",
          summary:
            "A fashion tint that balances warm and cool tones. Distinctive when darkened, and easy to wear with warm-metal and tortoiseshell frames.",
        },
        {
          name: "Pink",
          hex: "#B5738A",
          summary:
            "The softest of the six. A gentle, flattering tint with a light reduction in brightness  a style choice more than a glare solution.",
        },
      ],
    },
    specs: [
      { label: "Activation", value: "Ultraviolet light" },
      {
        label: "Darkening time",
        value: "Seconds to start, 30–90s to full tint",
      },
      { label: "Clear state", value: "Near-clear indoors" },
      { label: "UV protection", value: "In both clear and dark states" },
      { label: "Tints", value: "Grey, green, blue, yellow, purple, pink" },
      { label: "Available as", value: "Single vision, bifocal, progressive" },
    ],
    faqs: [
      {
        question: "Why don't my photochromic lenses go dark in the car?",
        answer: [
          "Because the windscreen has already removed the ultraviolet light the lens needs. Modern laminated windscreens block 98–99% of UV.",
          "The lens is working exactly as designed; there is simply nothing left to trigger it. Extra-active photochromics that also respond to visible light will tint somewhat behind glass  ask us about those if you drive a lot.",
        ],
      },
      {
        question: "How long do photochromic lenses last?",
        answer: [
          "The reaction is reversible and repeats thousands of times, so it does not 'run out' in normal use.",
          "Over several years the darkest state becomes slightly less deep. Most wearers replace the lenses on prescription change long before that becomes an issue.",
        ],
      },
      {
        question: "Can I have photochromic and blue cut together?",
        answer: [
          "Yes, in most materials. It is a common combination for people who are at a screen all day and outdoors on the commute.",
          "Bring your prescription in and we will confirm the combination is available in the material and power you need.",
        ],
      },
    ],
    compareWith: ["polarized", "blue-cut"],
  },

  /* --------------------------------------------------------- blue filter */
  {
    slug: "blue-filter",
    name: "Blue Filter Lenses",
    shortName: "Blue Filter",
    group: "Screen & indoor",
    tagline:
      "A gentler, colour-true blue filter  screen comfort without the yellow cast.",
    icon: "shield",
    image: `${IMG}/blue-filter.jpg`,
    imageAlt:
      "A clear lens with a subtle champagne tint standing on a warm surface in an evening interior",
    imageInUse: `${IMG}/blue-filter-use.jpg`,
    imageInUseAlt:
      "A designer at a colour-calibrated monitor wearing clear spectacles, colour proofs on the desk",
    intro: [
      "A blue filter lens  also sold as blue control  takes a lighter hand than blue cut. Instead of removing as much of the blue band as possible, it targets the most energetic blue-violet and lets the beneficial blue-turquoise through.",
      "The result is screen comfort with colours that still look right, which is why this is the lens we recommend to anyone who tried blue cut and disliked how warm everything went.",
    ],
    howItWorks: [
      "Blue control lenses filter roughly 20–30% of the most energetic blue-violet light  the top of the harmful band  while deliberately passing the blue-turquoise wavelengths that are involved in colour perception and in keeping your body clock on schedule.",
      "Because less of the spectrum is removed, the lens stays visually far closer to a plain clear lens. There is no strong yellow cast, and white backgrounds still read as white.",
      "Blue filter lenses are supplied with a full anti-reflective and hard coating, and the protection is usually broader than blue cut alone  full UV blocking is part of the same package rather than an extra.",
    ],
    benefits: [
      {
        title: "Colours stay true",
        body: "Designers, photographers, printers, tailors and anyone matching colour on screen can use these all day without second-guessing what they are looking at.",
      },
      {
        title: "Balanced rather than blunt",
        body: "It manages the intensity of blue light instead of removing as much of it as possible, so the light reaching you is calmer without being altered.",
      },
      {
        title: "Broader protection",
        body: "The specification typically bundles full UV blocking with the blue-violet filter and the anti-reflective layer, rather than treating each as a separate upgrade.",
      },
      {
        title: "Barely visible in the frame",
        body: "Without the strong yellow cast, the lens looks like a normal clear lens from the outside  no tint showing in photographs or on video calls.",
      },
    ],
    bestFor: [
      "Office workers and students on screens six to eight hours a day",
      "Colour-critical work  design, photography, printing, retail merchandising",
      "Anyone who found blue cut lenses too warm",
      "A first screen lens where you are not sure how strong a filter you want",
    ],
    goodToKnow: [
      "The same evidence caveat applies as to blue cut: the 2023 Cochrane review of 17 randomised trials found blue-light filtering lenses probably make no difference to computer eye strain or sleep quality, and no evidence of retinal protection.",
      "We fit them because wearers consistently report the pair more comfortable than plain uncoated lenses  most of which is the anti-reflective coating doing its job. That is worth paying for; a medical claim is not.",
      "It filters less blue-violet than a blue cut lens. If maximum filtering is what you specifically want, blue cut is the stronger option.",
      "Screen habits still matter more than lenses. Screen brightness matched to the room, a break every 20 minutes, and blinking properly beat any coating.",
    ],
    specs: [
      {
        label: "Filtering",
        value: "≈20–30% of blue-violet, blue-turquoise passed",
      },
      { label: "Appearance", value: "Clear, near-natural colour" },
      { label: "Coating", value: "Anti-reflective + hard coat + UV" },
      {
        label: "Typical use",
        value: "Office, study, colour-critical screen work",
      },
      { label: "Available as", value: "Single vision, bifocal, progressive" },
    ],
    faqs: [
      {
        question: "Is blue filter the same as anti-glare?",
        answer: [
          "No, though they are almost always sold together. Anti-glare  the anti-reflective coating  removes reflections from the surfaces of the lens, which is what makes screens and night driving more comfortable.",
          "The blue filter works on the wavelengths passing through the lens. A blue filter lens includes an anti-reflective coating; an anti-reflective lens does not necessarily include a blue filter.",
        ],
      },
      {
        question: "Can I get blue filter in a progressive lens?",
        answer: [
          "Yes. Blue filter is a property of the lens, not the design, so it can be made into single vision, bifocal or progressive.",
          "Blue filter with a progressive lens is a very common fit for anyone over forty working at a computer.",
        ],
      },
      {
        question: "Which should I choose  blue cut or blue filter?",
        answer: [
          "Choose blue filter if colour accuracy matters to you or you want the least noticeable lens.",
          "Choose blue cut if you want the strongest available filtering and the faint warm cast does not bother you.",
          "Bring both up when you come in  we will hold a sample of each against a screen so you can see the difference before deciding.",
        ],
      },
    ],
    compareWith: ["blue-cut", "uncoated"],
  },

  /* ------------------------------------------------------------ polarized */
  {
    slug: "polarized",
    name: "Polarized Lenses",
    shortName: "Polarized",
    group: "Sun & outdoor",
    tagline:
      "Kills reflected glare off water, wet roads and glass  in black, brown or yellow.",
    icon: "waves",
    image: `${IMG}/polarized.jpg`,
    imageAlt:
      "Polarised sunglasses held against bright sea water, showing calm glare-free water through the lenses",
    imageInUse: `${IMG}/polarized-use.jpg`,
    imageInUseAlt:
      "A driver in bright late-afternoon sun wearing dark polarised sunglasses",
    intro: [
      "Polarised lenses do something a tint alone cannot: they remove reflected glare. A dark tint makes everything dimmer, including the glare. A polarised lens removes the glare specifically and leaves the rest of the scene bright and detailed.",
      "It is the difference between squinting at a bright road and simply seeing it. We supply polarised lenses in three tints  black, brown and yellow  each suited to different light.",
    ],
    howItWorks: [
      "Light bouncing off a flat surface  water, a wet road, a car bonnet, a shop window, sand  comes back mostly polarised in one direction, horizontally. That concentrated horizontal light is what you experience as blinding glare.",
      "A polarised lens has a filter laminated inside it, oriented vertically. It passes light vibrating vertically and blocks light vibrating horizontally, so the reflected glare is cut out while the useful light continues through.",
      "The effect is immediate and obvious: look at water through a polarised lens and you can see into it rather than at the reflection sitting on top of it.",
    ],
    benefits: [
      {
        title: "Reflected glare simply goes",
        body: "Water, wet tarmac, windscreens, painted metal and sand stop throwing light back at you. This is not a subtle improvement  it is the first thing everyone notices.",
      },
      {
        title: "Safer driving in bright light",
        body: "Glare off the road surface and off the car in front is exactly the light a polarised lens removes, so hazards, markings and brake lights stay easy to pick out.",
      },
      {
        title: "Less squinting, less fatigue",
        body: "A long day outdoors spent squinting is a long day of tension around the eyes. Removing the glare removes the reason to squint.",
      },
      {
        title: "Sharper contrast and colour",
        body: "With the reflected wash taken off, colours look deeper and edges look better defined  noticeably so on water and greenery.",
      },
    ],
    bestFor: [
      "Driving, especially on wet roads and in low sun",
      "Beach days, boats and fishing",
      "Cricket, cycling, running and outdoor sport",
      "Anyone who finds bright days genuinely uncomfortable",
      "Prescription sunglasses that will be worn every day",
    ],
    goodToKnow: [
      "LCD and LED screens can go dim or black through a polarised lens at certain angles  car dashboards, fuel pumps, ATMs and phone screens are the common ones. Tilting your head usually restores them.",
      "Pilots and some machine operators are advised against polarised lenses for exactly that reason. If you fly or operate equipment with polarised displays, tell us before you order.",
      "Polarisation and UV protection are separate things. A polarised lens is not automatically 100% UV  check the specification, and we will confirm it on whatever you choose.",
      "In snow, ice or very flat light polarisation can hide the surface reflections you actually want to see. Not a Sri Lankan problem, but worth knowing if you travel to ski.",
    ],
    variants: {
      title: "Three polarised tints",
      description:
        "All three block the same reflected glare. The tint decides how the remaining light reaches you.",
      items: [
        {
          name: "Black / Grey",
          hex: "#2B2B2B",
          summary:
            "The true-colour choice. Cuts overall brightness evenly without distorting colours, which makes it the best general-purpose tint and the standard recommendation for driving  traffic lights and road markings stay exactly the colour they should be.",
        },
        {
          name: "Brown",
          hex: "#5C3A20",
          summary:
            "The contrast and depth choice. Brown and amber lift contrast and improve depth perception, and handle changing light better than grey  the tint for fishing, cycling, hiking and long days where the sun keeps going in and out.",
        },
        {
          name: "Yellow",
          hex: "#D8B23A",
          summary:
            "The low-light choice. Yellow gives the strongest contrast of the three and is the most effective in dull, overcast, hazy and dusk conditions, and for tracking fast-moving objects. Colours shift noticeably, so it is a purpose lens rather than an all-day one.",
        },
      ],
    },
    specs: [
      { label: "Filter", value: "Vertically oriented polarising layer" },
      { label: "Blocks", value: "Horizontally polarised reflected glare" },
      { label: "Tints", value: "Black / grey, brown, yellow" },
      { label: "Typical use", value: "Driving, water, sport, everyday sun" },
      { label: "Available as", value: "Single vision, bifocal, progressive" },
    ],
    faqs: [
      {
        question:
          "What is the difference between polarised and just a dark tint?",
        answer: [
          "A tint reduces how much light gets through, across the board. It makes the scene darker, glare included, but the glare is still there relative to everything else.",
          "A polarised lens targets reflected glare specifically and removes it, so the scene stays bright and detailed with the glare taken out. Once you have compared them side by side the difference is hard to unsee.",
        ],
      },
      {
        question: "Which tint should I pick?",
        answer: [
          "Black or grey if you want one pair for everything and for driving.",
          "Brown if you spend time on water, on a bike, or in light that keeps changing.",
          "Yellow if your problem is dull, hazy or fading light rather than bright sun.",
        ],
      },
      {
        question: "Can I get polarised lenses in my prescription?",
        answer: [
          "Yes  polarised prescription sunglasses are one of the most common jobs we do, in single vision, bifocal and progressive.",
          "Bring your prescription and your chosen frame, or pick a frame with us. Wrap-around sports frames have curvature limits on prescription strength, so let us check the frame against your power before you commit.",
        ],
      },
    ],
    compareWith: ["photochromic", "progressive"],
  },

  /* ------------------------------------------------------------- bifocal */
  {
    slug: "bifocal",
    name: "Bifocal Lenses",
    shortName: "Bifocal",
    group: "Multifocal",
    tagline:
      "Distance on top, reading below, one clear line between  the fastest multifocal to get used to.",
    icon: "layers",
    image: `${IMG}/bifocal.jpg`,
    imageAlt:
      "Close-up of a bifocal lens showing the visible dividing line and half-moon reading segment",
    imageInUse: `${IMG}/bifocal-use.jpg`,
    imageInUseAlt:
      "An older man reading a newspaper by a window through bifocal spectacles",
    intro: [
      "A bifocal lens carries two separate powers in one lens: your distance prescription across the top, and your reading prescription in a segment at the bottom, with a visible line where they meet.",
      "It is the oldest answer to presbyopia and still one of the best, because the two zones are wide, stable and completely unambiguous  you always know exactly where to look.",
    ],
    howItWorks: [
      "The reading power sits in a small half-moon shaped segment fused into the lower part of the lens. Everything above the line is your distance prescription; everything inside the segment is your reading prescription. There is nothing in between.",
      "In use you simply drop your eyes to read and lift them to look up. Because the change is abrupt rather than gradual, there is no corridor to learn and no soft zone to work around.",
      "The segment is positioned to your own measurements when the lens is fitted, so the line sits below your normal line of sight and out of the way for distance.",
    ],
    benefits: [
      {
        title: "A wide, stable reading zone",
        body: "The reading segment is as wide as it looks  no narrowing corridor, no soft edges. For long stretches of reading it is genuinely more comfortable than a progressive.",
      },
      {
        title: "Almost no adaptation",
        body: "Most wearers are comfortable in three to seven days. The two zones are distinct, so your brain has very little to learn  you look down, you read.",
      },
      {
        title: "Substantially cheaper",
        body: "Bifocals cost a fraction of what an equivalent progressive costs, which makes them the sensible choice on a budget or for a second pair.",
      },
      {
        title: "Reliable at strong reading powers",
        body: "When the difference between distance and reading power is large, a bifocal's straightforward split often outperforms a progressive corridor.",
      },
    ],
    bestFor: [
      "First-time multifocal wearers who want certainty over cosmetics",
      "Long reading sessions  books, ledgers, paperwork",
      "Strong reading additions",
      "A budget-conscious upgrade from carrying two pairs",
      "Anyone who has tried progressives and could not get on with them",
    ],
    goodToKnow: [
      "The line is visible, to you and to everyone else. For many wearers that is the deciding factor against bifocals.",
      "There is no intermediate zone. Computer screens, car dashboards, music stands and supermarket shelves sit at a distance neither half of the lens corrects properly  this is the single biggest limitation.",
      "Objects appear to 'jump' as your eye crosses the segment edge. It is normal, it settles within days, but it is real and stairs deserve care in the first week.",
      "If you spend your day at a screen, ask us about a progressive or a dedicated office lens instead  a bifocal will fight you at that distance.",
    ],
    specs: [
      { label: "Zones", value: "Two  distance and near" },
      { label: "Dividing line", value: "Visible" },
      { label: "Intermediate vision", value: "Not corrected" },
      { label: "Adaptation", value: "Typically 3–7 days" },
      { label: "Typical use", value: "Distance plus sustained reading" },
    ],
    faqs: [
      {
        question: "Will I trip on stairs with bifocals?",
        answer: [
          "In the first few days you may misjudge a step, because looking down through the reading segment puts the stairs out of focus and the segment edge causes a small image jump.",
          "The fix is habit: on stairs, drop your chin rather than your eyes so you look through the distance part of the lens. Most wearers stop thinking about it within a week.",
        ],
      },
      {
        question: "Can I use bifocals at a computer?",
        answer: [
          "Not comfortably. A screen sits at intermediate distance, and a bifocal corrects only distance and near  so you end up tilting your head back to catch the screen through the reading segment.",
          "For screen work, a progressive lens or a dedicated office lens is the right answer. We can make one of each if you split your day between desk and out-and-about.",
        ],
      },
      {
        question: "Can the line be made less visible?",
        answer: [
          "The segment shape and size can be chosen to be less obvious, and a smaller segment in a well-fitted frame is discreet. But a bifocal always has a line  that is what makes it a bifocal.",
          "If invisibility is the priority, a progressive lens is the only option that removes the line entirely.",
        ],
      },
    ],
    compareWith: ["progressive", "uncoated"],
  },

  /* --------------------------------------------------------- progressive */
  {
    slug: "progressive",
    name: "Progressive Lenses",
    shortName: "Progressive",
    group: "Multifocal",
    tagline:
      "Distance, screen and reading in one lens, with no visible line anywhere.",
    icon: "glasses",
    image: `${IMG}/progressive.jpg`,
    imageAlt:
      "Close-up of a smooth line-free progressive lens catching a continuous gradient of light",
    imageInUse: `${IMG}/progressive-use.jpg`,
    imageInUseAlt:
      "A woman glancing between a laptop screen and a printed page through progressive lenses",
    intro: [
      "A progressive lens changes power gradually from top to bottom: distance at the top, intermediate through the middle, reading at the bottom, with no line and no jump between them.",
      "It is the closest thing to how your eyes worked before presbyopia  one pair, every distance, and nobody can tell by looking at you.",
    ],
    howItWorks: [
      "Rather than fusing separate segments, the surface of a progressive lens is ground so the power increases smoothly down a corridor running through the middle of the lens. Look straight ahead for distance, drop slightly for a screen, drop further for a book.",
      "That corridor has to line up with your eye, which is why a progressive lens cannot be made from a prescription alone. We measure your pupillary distance and your fitting height in the actual frame you are buying, and the lens is made to those numbers.",
      "Modern free-form or digital progressives are surfaced point by point under computer control, using your prescription, the frame shape and the fitting geometry to widen the usable corridor compared with older moulded designs.",
    ],
    benefits: [
      {
        title: "No line, no giveaway",
        body: "The most-cited reason people choose progressives: the lens looks like an ordinary single vision lens, and nothing about it announces a reading prescription.",
      },
      {
        title: "The intermediate zone bifocals do not have",
        body: "Computer screens, dashboards, price labels and music stands all sit at intermediate distance. A progressive is the only lens design that corrects it in the same pair as distance and reading.",
      },
      {
        title: "No image jump",
        body: "Because the power changes smoothly, nothing shifts or jumps as your eye moves down the lens  stairs and kerbs behave the way they always did.",
      },
      {
        title: "One pair for a whole day",
        body: "Driving in, working at a screen, reading a menu at lunch, watching a match in the evening  all of it through the same glasses.",
      },
    ],
    bestFor: [
      "Presbyopia with an active day that keeps switching distance",
      "Desk and screen work  the intermediate zone is the reason",
      "Anyone who does not want a visible line",
      "Wearers moving up from two separate pairs",
      "Prescription sunglasses that also need a reading power",
    ],
    goodToKnow: [
      "Adaptation takes longer than a bifocal  typically one to three weeks. Dizziness, mild headache and a swimming sensation in your peripheral vision are common in the first days and normally settle.",
      "The peripheral areas either side of the corridor are soft by design. You learn to point your nose at what you want to look at instead of moving only your eyes  that habit is the single biggest hurdle.",
      "Fitting accuracy is not optional. The lens must be made to your measurements in the frame you have chosen, so progressives cannot be ordered from a prescription over the phone.",
      "They cost considerably more than bifocals. A wider, easier corridor is largely what the extra money buys  the premium free-form designs are noticeably easier to adapt to.",
      "Very small or very deep frames restrict the corridor. We will tell you honestly if a frame you like is a poor host for your progressive.",
    ],
    specs: [
      { label: "Zones", value: "Three  distance, intermediate, near" },
      { label: "Dividing line", value: "None" },
      { label: "Intermediate vision", value: "Corrected" },
      { label: "Adaptation", value: "Typically 1–3 weeks" },
      { label: "Fitting", value: "PD and fitting height measured in store" },
    ],
    faqs: [
      {
        question: "Why do progressives make me feel dizzy at first?",
        answer: [
          "Your brain has spent a lifetime with one power across the whole lens. A progressive gives it a moving target, and the soft areas either side of the corridor make your peripheral vision seem to sway when you turn your head.",
          "Wear them full time for the first two weeks rather than switching back to your old pair  swapping back and forth is what makes adaptation drag on. If it has not settled after three weeks, come in and we will recheck the fit.",
        ],
      },
      {
        question: "Can I get progressives with blue cut or photochromic?",
        answer: [
          "Yes to both, and the combination is common. Progressive with a blue filter is the standard fit for anyone over forty working at a screen.",
          "Progressive photochromic and progressive polarised sunglasses are both available too.",
        ],
      },
      {
        question: "Do I need to buy an expensive progressive?",
        answer: [
          "Not necessarily, but the design grade genuinely matters here more than on any other lens. Premium free-form designs give a wider corridor and softer peripheral distortion, which is exactly what makes the difference between adapting easily and giving up.",
          "If it is your first progressive, we usually suggest not choosing the cheapest design available  the money saved is often the reason the lens ends up in a drawer.",
        ],
      },
    ],
    compareWith: ["bifocal", "blue-filter", "polarized"],
  },

  /* --------------------------------------------------------- neo vision */
  {
    slug: "neo-vision",
    name: "Neo Vision Lenses",
    shortName: "Neo Vision",
    group: "Premium ranges",
    tagline:
      "A stocked premium lens range  ask our team for the current specification and pricing.",
    icon: "sparkles",
    image: `${IMG}/neo-vision.jpg`,
    imageAlt:
      "A very thin high-index clear spectacle lens standing on edge to show its slim profile",
    imageInUse: `${IMG}/neo-vision-use.jpg`,
    imageInUseAlt:
      "An optician holding a very thin lens up to the light to show how slim its edge is",
    supplierRange: true,
    intro: [
      "Neo Vision is one of the supplier lens ranges we stock and fit at Metro Opticals, sitting above our standard clear lenses on thinness, finish and coating package.",
      "Because the exact specification of a supplier range changes with each production series, the detail below describes what the range is for rather than quoting figures we cannot keep current. Our team will confirm the current index, coating package and price for your prescription when you come in.",
    ],
    howItWorks: [
      "Premium lens ranges differ from entry-level lenses in three practical ways: the refractive index of the material, the quality and number of surface coating layers, and the accuracy of the surfacing itself.",
      "A higher index bends light more strongly, so the same prescription can be made in a thinner, flatter, lighter lens  which matters most at higher powers, where a standard lens starts to look heavy at the edges.",
      "A better coating package usually means a harder scratch-resistant layer, a more efficient anti-reflective stack, and a hydrophobic top layer that keeps water, oil and fingerprints from sticking  the difference you feel every time you clean them.",
    ],
    benefits: [
      {
        title: "Thinner and lighter at higher powers",
        body: "The stronger your prescription, the more a premium material shows  flatter lens faces, less edge thickness, and a pair that stops sliding down your nose.",
      },
      {
        title: "A better coating package",
        body: "Harder scratch resistance and an easier-cleaning top layer keep the lenses looking newer for longer than an entry-level coating does.",
      },
      {
        title: "Fitted and checked in store",
        body: "Whatever the range, the lens is glazed to your frame and verified against your prescription before it leaves us.",
      },
      {
        title: "Available across designs",
        body: "Premium ranges are normally offered in single vision, bifocal and progressive, and can usually be combined with blue filtering or photochromic.",
      },
    ],
    bestFor: [
      "Higher prescriptions where standard lenses look thick",
      "Rimless and semi-rimless frames that need a stronger material",
      "Anyone who wants the best finish available in the frame they have chosen",
      "Wearers replacing a pair that scratched or clouded too quickly",
    ],
    goodToKnow: [
      "We have deliberately not published index figures, transmission percentages or price points for this range on the website, because supplier specifications change and a stale number is worse than none.",
      "Call or message us with your prescription and we will tell you exactly what the current Neo Vision option is, what it costs, and whether it is genuinely worth it for your power  sometimes it is not.",
      "If your prescription is low, a premium range may make very little visible difference to lens thickness. We will say so.",
    ],
    specs: [
      { label: "Range type", value: "Premium stocked lens range" },
      { label: "Specification", value: "Confirmed in store  ask our team" },
      {
        label: "Typical use",
        value: "Higher powers, rimless frames, best finish",
      },
      {
        label: "Available as",
        value: "Ask about single vision, bifocal, progressive",
      },
    ],
    faqs: [
      {
        question: "Why isn't the full specification listed here?",
        answer: [
          "Because supplier lens ranges are revised regularly, and publishing an index or a coating spec that later changes would mislead you.",
          "Message or call the store with your prescription and we will give you the current, accurate answer for the pair you are actually buying.",
        ],
      },
      {
        question: "Is a premium range worth the extra cost?",
        answer: [
          "It depends almost entirely on your prescription. At higher powers the difference in thickness and weight is immediately obvious and usually worth it.",
          "At low powers the difference can be marginal, and we would rather tell you that than sell you an upgrade you will not notice.",
        ],
      },
    ],
    compareWith: ["omega", "progressive"],
  },

  /* -------------------------------------------------------------- omega */
  {
    slug: "omega",
    name: "Omega Lenses",
    shortName: "Omega",
    group: "Premium ranges",
    tagline:
      "A stocked premium lens range  ask our team for the current specification and pricing.",
    icon: "gem",
    image: `${IMG}/omega.jpg`,
    imageAlt:
      "A premium pair of clear lenses seated in an elegant thin gold spectacle frame",
    imageInUse: `${IMG}/omega-use.jpg`,
    imageInUseAlt:
      "A lens being seated into a thin gold metal frame on an optician's workbench",
    supplierRange: true,
    intro: [
      "Omega is one of the supplier lens ranges stocked and fitted at Metro Opticals, offered as an upgrade over our standard clear lens on material, coating and finish.",
      "As with any supplier range, the exact specification moves between production series. Rather than publish figures that will drift out of date, this page explains what a premium range buys you  and our team will confirm the current specification and price against your prescription.",
    ],
    howItWorks: [
      "A prescription lens is made of a material with a given refractive index, surfaced to your power, then coated. A premium range improves all three of those steps rather than any one of them.",
      "A higher-index material lets the same power be made thinner and flatter. More accurate surfacing keeps the optics true right out to the edge of the lens instead of only through the centre.",
      "The coating stack is where you notice it day to day: a hard layer to resist scratching, an anti-reflective stack to remove surface reflections, and a hydrophobic and oleophobic top layer so rain beads off and fingerprints wipe away in one pass.",
    ],
    benefits: [
      {
        title: "A thinner, flatter finish",
        body: "The lens sits better in the frame, weighs less on your nose, and does not bulge out of the front of a thin acetate or metal rim.",
      },
      {
        title: "Cleaner optics to the edge",
        body: "Better surfacing keeps the useful area of the lens wider, so you are not restricted to looking through the middle of it.",
      },
      {
        title: "Easier to keep clean",
        body: "A hydrophobic top layer is a small feature that you appreciate every single day, especially in monsoon season.",
      },
      {
        title: "Fitted, glazed and verified with us",
        body: "Ordered to your frame and measurements, and checked against your prescription before collection.",
      },
    ],
    bestFor: [
      "Anyone who wants the best available finish in their chosen frame",
      "Moderate to high prescriptions",
      "Thin metal, acetate, rimless and semi-rimless frames",
      "Daily-wear pairs that need to survive real use",
    ],
    goodToKnow: [
      "No index, transmission or price figures are published here on purpose  supplier ranges are revised, and an out-of-date number on a website is worse than sending you to a person.",
      "Bring or send your prescription and we will tell you what the current Omega option is and whether it makes a real difference at your power.",
      "A premium lens does not change your prescription. If your vision has changed, the lens grade is the second conversation, not the first  book an eye test.",
    ],
    specs: [
      { label: "Range type", value: "Premium stocked lens range" },
      { label: "Specification", value: "Confirmed in store  ask our team" },
      {
        label: "Typical use",
        value: "Everyday premium wear, thin and rimless frames",
      },
      {
        label: "Available as",
        value: "Ask about single vision, bifocal, progressive",
      },
    ],
    faqs: [
      {
        question: "How does Omega compare with Neo Vision?",
        answer: [
          "Both are premium ranges we stock, and which one suits you depends on your prescription, your frame and what is in stock when you order.",
          "The most useful thing you can do is tell us your power and the frame you like  we will lay the current options side by side with prices rather than guess for you here.",
        ],
      },
      {
        question: "Can I have Omega lenses with a blue filter or photochromic?",
        answer: [
          "Usually yes, and it is a common request. Availability depends on the material and the power you need.",
          "Send us your prescription and the combination you want and we will confirm it before you order.",
        ],
      },
    ],
    compareWith: ["neo-vision", "progressive"],
  },
];

/** Menu and index ordering  grouped, and the order the groups render in. */
export const LENS_GROUP_ORDER: LensGroup[] = [
  "Clear & coated",
  "Screen & indoor",
  "Sun & outdoor",
  "Multifocal",
  "Premium ranges",
];

export const getLensType = (slug: string) =>
  lensTypes.find((lens) => lens.slug === slug);

export const lensSlugs = lensTypes.map((lens) => lens.slug);

/** Lens types bucketed by group, in `LENS_GROUP_ORDER`, empty groups dropped. */
export const lensTypesByGroup = LENS_GROUP_ORDER.map((group) => ({
  group,
  lenses: lensTypes.filter((lens) => lens.group === group),
})).filter((bucket) => bucket.lenses.length > 0);
