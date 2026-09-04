$ErrorActionPreference = 'Stop'
$path = 'src\components\work\caseStudyData.ts'

# Read as UTF-8 and write back as UTF-8 without BOM. The existing prose is full
# of em dashes and accented characters (Rene, Bangladeshi place names); this
# script only INSERTS new lines after each record's ASCII `id:` anchor, so not a
# byte of the existing copy is rewritten or re-encoded.
$t = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
$log = @()

$blocks = [ordered]@{}

$blocks['pencillink'] = @'
    client: 'PencilLink',
    industry: 'Business services',
    role: 'Design, build & CMS',
    scope: ['Brand Site', 'Service Architecture', 'CMS', 'Lead Capture'],
    timeline: '3 months',
    status: 'Live',
    problem: [
      'A growth agency was pitching full-cycle partnership through a site that read as a list of unrelated services.',
      'Prospects could not tell which of the six offerings applied to them, so qualified enquiries arrived asking questions the site should have answered.',
      'Every case the team won was won on a call, not on the page.',
    ],
    principles: [
      {
        title: 'One partner, not six services',
        body: 'Offerings are framed as stages of one engagement, so the range reads as capability rather than as scatter.',
      },
      {
        title: 'Qualify before the call',
        body: 'Scope, process and working style are stated on the page, so the first conversation starts at the brief.',
      },
      {
        title: 'Editable by the team, not the developer',
        body: 'Every claim, case and service block is CMS-backed, because copy that needs a deploy never gets updated.',
      },
    ],
    screens: [
      { label: 'Hero', caption: 'States the partnership offer in one line, before any service list.' },
      { label: 'Service stages', caption: 'Turns six separate offerings into one legible sequence of work.' },
      { label: 'Process', caption: 'Shows how an engagement actually runs, so the first call is not spent explaining it.' },
      { label: 'Case index', caption: 'Puts delivered work in front of the enquiry form rather than behind it.' },
      { label: 'Enquiry', caption: 'Collects scope and budget context up front, which is what makes a lead qualified.' },
    ],
    buildNotes: [
      'React and Tailwind front end, deployed on Vercel with preview builds per branch.',
      'Service, case and testimonial content is CMS-driven - no copy change requires a deploy.',
      'Layouts are fluid between 360px and 1920px rather than snapped to device breakpoints.',
      'Images are served in modern formats and lazily loaded below the fold.',
      'Scroll motion is short and single-purpose, and is disabled under prefers-reduced-motion.',
    ],
    pagesDelivered: ['Home', 'Services', 'Process', 'Work', 'About', 'Contact'],
    paletteNames: ['Ink', 'Signal', 'Support'],
'@

$blocks['bela-vista'] = @'
    client: 'Bela Vista Resort',
    industry: 'Hospitality',
    role: 'Design & build',
    scope: ['Hospitality Site', 'Booking Journey', 'Content Direction'],
    timeline: '6 weeks',
    status: 'Live',
    problem: [
      "Bangladesh's only coral island was being sold like a spreadsheet - room counts, rates, amenity checklists.",
      'The one thing a guest is actually buying, the feeling of arriving on that shore, was nowhere on the page.',
      'Guests comparing resorts had nothing to compare except price, so the property competed on the only axis it could not win.',
    ],
    principles: [
      {
        title: 'Sell emotion first',
        body: 'The shore takes the entire first screen, silent and full-bleed. Specifications wait until the guest wants them.',
      },
      {
        title: 'Make booking easy',
        body: 'The reservation route is reachable from every screen, so intent is never more than one action from action.',
      },
      {
        title: 'Use proof over adjectives',
        body: 'Verified Google reviews carry the trust, because a guest believes another guest and discounts the brand.',
      },
    ],
    screens: [
      { label: 'Arrival', caption: 'Gives the shore the full first screen so the sell is the place, not the rate.' },
      { label: 'Experience pillars', caption: 'Reduces the stay to three things worth travelling for: West Beach, cottages, BBQ.' },
      { label: 'Cottages', caption: 'Answers what the guest sleeps in without turning into a specification table.' },
      { label: 'Reviews', caption: 'Hands the trust argument to verified guests instead of to adjectives.' },
      { label: 'Reservation', caption: 'Keeps booking one action away from wherever the guest was persuaded.' },
    ],
    buildNotes: [
      'React and Tailwind, deployed on Vercel.',
      'Muted autoplaying shore video with a poster frame first paint, so the hero is never blank while it loads.',
      'Video is replaced by a still on narrow screens and on metered connections.',
      'Gold-on-navy editorial system held to a 4px radius throughout.',
      'Google review content is pulled in as structured data rather than pasted as screenshots.',
    ],
    pagesDelivered: ['Home', 'Cottages', 'Experiences', 'Gallery', 'Reservation', 'Contact'],
    paletteNames: ['Deep navy', 'Gold', 'Near black'],
'@

$blocks['rene-architect'] = @'
    client: 'Rene Architect',
    industry: 'Architecture',
    role: 'Design & build',
    scope: ['Studio Site', 'Project Sequencing', 'Motion Direction'],
    timeline: '2 months',
    status: 'Live',
    problem: [
      'A 300-project firm was showing fifteen years of built work as a photo grid.',
      'Scale and craft - the only things a client is buying from an architect - vanished into thumbnails.',
      'Prospective clients left with a sense of quantity and no sense of quality.',
    ],
    principles: [
      {
        title: 'A sequence, not a gallery',
        body: 'Projects arrive one at a time, at full height, so each building gets the attention a building needs.',
      },
      {
        title: 'Name buildings like buildings',
        body: 'Emerald Silence. Sunlit Solitude. Earth and Light. A named work is remembered; a filename is not.',
      },
      {
        title: 'Discipline over decoration',
        body: 'Zero border radius everywhere, because the site should hold the same edges the practice does.',
      },
    ],
    screens: [
      { label: 'Entry', caption: 'Opens with an opt-in cinematic sequence that sets scale before any copy.' },
      { label: 'WE DESIGN / WE BUILD', caption: 'Splits the practice in two full-screen statements instead of a paragraph.' },
      { label: 'Process', caption: 'Reduces the practice to three honest stages - Concept, Design, Build - with no jargon.' },
      { label: 'Project reveal', caption: 'Gives one building the whole viewport so craft survives at reading size.' },
      { label: 'Contact', caption: 'Ends on the studio, its city and one way to start a conversation.' },
    ],
    buildNotes: [
      'React, Tailwind and GSAP, deployed on Netlify.',
      'Scroll-driven reveals are ScrollTrigger-based and pinned only where the sequence needs it.',
      'Audio is strictly opt-in and never autoplays.',
      'Full-bleed architectural photography is served responsively at several widths to protect mobile data.',
      'All motion collapses to plain fades under prefers-reduced-motion.',
    ],
    pagesDelivered: ['Home', 'Practice', 'Process', 'Projects', 'Contact'],
    paletteNames: ['Carbon', 'Deep teal', 'Slate blue'],
'@

$blocks['sonapahar'] = @'
    client: 'Sonapahar Farmhouse Resort',
    industry: 'Hospitality',
    role: 'Design & build',
    scope: ['Resort Site', 'Villa Pages', 'Rate Transparency'],
    timeline: '6 weeks',
    status: 'Live',
    problem: [
      'A hill farmhouse resort was taking bookings through phone calls and social messages.',
      'Rates, villa differences and what the tariff actually included were explained one guest at a time, over and over.',
      'Guests asked the same three questions before every booking, which is a website problem, not a staffing problem.',
    ],
    principles: [
      {
        title: 'Answer the tariff question first',
        body: 'Rates and what they include are printed plainly, because a hidden price reads as an expensive one.',
      },
      {
        title: 'Give each villa its own character',
        body: 'Akash, Kusum and Madhavilata are presented as three different stays, not three room codes.',
      },
      {
        title: 'Let the hill do the selling',
        body: 'Warm, wide photography carries the mood; the copy stays out of its way.',
      },
    ],
    screens: [
      { label: 'Hero', caption: 'Establishes the hill setting before a single amenity is mentioned.' },
      { label: 'Villas', caption: 'Turns three villas into three distinct stays a guest can choose between.' },
      { label: 'Tariff', caption: 'States nightly rates and VAT openly so the pricing question never reaches staff.' },
      { label: 'Grounds', caption: 'Shows what there is to do once the guest has arrived and unpacked.' },
      { label: 'Getting here', caption: 'Answers the second most asked question - how far, and how - with a route and a map.' },
    ],
    buildNotes: [
      'React and Tailwind, deployed on Netlify.',
      'Villa content is data-driven, so a fourth villa is a record rather than a new page.',
      'Rates and VAT live in one place and are printed from it, so they cannot disagree between pages.',
      'Photography is compressed and lazily loaded, since this audience arrives largely on mobile data.',
      'Layout is fluid from 360px up, with the villa grid collapsing to a single column early.',
    ],
    pagesDelivered: ['Home', 'Villas', 'Tariff', 'Grounds', 'Location', 'Contact'],
    paletteNames: ['Bone', 'Wheat gold', 'Forest'],
'@

$blocks['oxygen-sports'] = @'
    client: 'Oxygen Sports Zone',
    industry: 'Sport & recreation',
    role: 'Design & build',
    scope: ['Turf Site', 'Slot Enquiry Flow', 'Facility Pages'],
    timeline: '5 weeks',
    status: 'Live',
    problem: [
      'A turf ground was run entirely through phone calls: one caller at a time asking which slots were free.',
      'Players could not see what the ground offered, what it cost, or when it was open without ringing first.',
      'The busiest hours were also the hours nobody could get through.',
    ],
    principles: [
      {
        title: 'Get to the slot fast',
        body: 'Booking intent is the only reason anyone opens this site, so the enquiry route is never more than one action away.',
      },
      {
        title: 'Show the ground, not a stock pitch',
        body: 'Real photography of the actual turf, under actual floodlights, because players recognise their own ground.',
      },
      {
        title: 'State the terms plainly',
        body: 'Hours, rates and facilities are printed, which removes the entire category of question the phone was answering.',
      },
    ],
    screens: [
      { label: 'Hero', caption: 'Leads with the ground under lights and a single booking action.' },
      { label: 'Facilities', caption: 'Lists what a team actually gets - surface, lighting, changing, parking.' },
      { label: 'Rates & hours', caption: 'Publishes the terms so the phone stops being the price list.' },
      { label: 'Slot enquiry', caption: 'Captures date, time and team size, so the callback starts with an answer.' },
      { label: 'Location', caption: 'Puts the ground on a map for players deciding between two nearby turfs.' },
    ],
    buildNotes: [
      'React and Tailwind, deployed on Netlify.',
      'Enquiry form posts to a single endpoint with client and server side validation.',
      'Built mobile-first: nearly every visit is a phone deciding on the way to a match.',
      '12px radius system and a green-on-black palette drawn from the floodlit turf itself.',
      'Hover motion is limited to buttons and cards, so it degrades cleanly on touch.',
    ],
    pagesDelivered: ['Home', 'Facilities', 'Rates', 'Booking enquiry', 'Contact'],
    paletteNames: ['Night black', 'Turf green', 'Bone'],
'@

$blocks['vantra-logistics'] = @'
    client: 'Self-initiated concept',
    industry: 'Freight & logistics',
    role: 'Design study',
    scope: ['Concept Brand Site', 'Interface System', 'Motion Study'],
    timeline: '3 weeks',
    status: 'Concept - not a client engagement',
    problem: [
      'Freight sites sell trust with stock photography of lorries and a paragraph about reliability.',
      'Nothing on them tells a shipper what actually happens to their consignment, or when.',
      'This study asks what the category looks like if the interface, rather than the adjectives, carries the confidence.',
    ],
    principles: [
      {
        title: 'Speed as the visual argument',
        body: 'Type, motion and orange signal are tuned to read as momentum before a word is read.',
      },
      {
        title: 'Show the operation',
        body: 'Tracking, lanes and status are treated as interface surfaces rather than as marketing claims.',
      },
      {
        title: 'Hard edges, no softening',
        body: 'Zero radius and a single accent, because a logistics brand that looks friendly does not look precise.',
      },
    ],
    screens: [
      { label: 'Hero', caption: 'Makes the speed claim structurally, through scale and motion rather than copy.' },
      { label: 'Lanes', caption: 'Shows coverage as a network a shipper can read at a glance.' },
      { label: 'Tracking', caption: 'Treats consignment status as the product surface, not as a support page.' },
      { label: 'Fleet', caption: 'Answers capacity questions with specifics instead of lorry photography.' },
      { label: 'Quote', caption: 'Reduces the first contact to the three fields a quote actually needs.' },
    ],
    buildNotes: [
      'React, Tailwind and GSAP, deployed on Netlify.',
      'Zero border radius and one accent colour, applied to single points only.',
      'Scroll and hover motion built on a shared easing set so the whole site moves as one system.',
      'Fully responsive from 360px, with the lane and tracking views reflowing rather than scaling down.',
      'Numbers shown in the interface are illustrative fixtures, labelled as such in the copy.',
    ],
    pagesDelivered: ['Home', 'Services', 'Network', 'Tracking', 'Quote'],
    paletteNames: ['Carbon', 'Signal orange', 'Steel'],
'@

$blocks['type-archive'] = @'
    client: 'Self-initiated product',
    industry: 'Design tools',
    role: 'Design, build & API',
    scope: ['Web App', 'Font Preview Engine', 'Public API'],
    timeline: '2 months',
    status: 'Live - actively maintained',
    problem: [
      'Choosing a typeface means opening a dozen foundry pages and typing the same sentence into each of them.',
      'Nothing lets you preview every family you own side by side, in your own words, at your own size.',
      'The comparison a designer actually needs to make is the one no font site supports.',
    ],
    principles: [
      {
        title: 'Every family, previewed',
        body: 'One string of your text renders across the whole archive at once - comparison is the product.',
      },
      {
        title: 'Readable defaults, then control',
        body: 'It opens on a sensible size and specimen, and only then exposes weight, size and spacing.',
      },
      {
        title: 'Machine readable too',
        body: 'The same archive is exposed over an API and as plain text, so other tools can consume it.',
      },
    ],
    screens: [
      { label: 'Archive', caption: 'Renders every family against one shared string, which is the comparison that matters.' },
      { label: 'Live specimen', caption: 'Lets a designer type their own words instead of reading a canned pangram.' },
      { label: 'Family detail', caption: 'Shows all styles in a family together so weight range is judged, not guessed.' },
      { label: 'Controls', caption: 'Exposes size, weight and spacing without burying the preview under a panel.' },
      { label: 'API', caption: 'Documents the endpoints so the archive is usable from outside the interface.' },
    ],
    buildNotes: [
      'Next.js App Router with TypeScript, deployed behind a custom subdomain.',
      'Fonts are loaded on demand per family, so a large archive does not block first paint.',
      'Public surfaces: /api/fonts as JSON, plus /fonts.txt and /llms.txt as plain text.',
      'Preview rendering is virtualised, which is what keeps scrolling smooth as families grow.',
      'Fully keyboard navigable, since this is a tool people use for long sittings.',
    ],
    pagesDelivered: ['Archive', 'Family detail', 'API docs', 'About'],
    paletteNames: ['Paper', 'Ink', 'Highlight'],
'@

$blocks['gdrive-host'] = @'
    client: 'Open source',
    industry: 'Developer tools',
    role: 'Design, build & maintenance',
    scope: ['Open Source Tool', 'Documentation', 'Hosted Demo'],
    timeline: '1 month',
    status: 'Live - open source, MIT',
    problem: [
      'Small projects need image hosting and reach for a paid CDN or a free tier that expires.',
      'Everyone already has a Drive full of storage that cannot be pointed at a website.',
      'The gap is not storage, it is a usable URL - which is the whole tool.',
    ],
    principles: [
      {
        title: 'Use the storage people already have',
        body: 'No new account, no new bill: a Drive file becomes a direct, hotlinkable media URL.',
      },
      {
        title: 'One paste, one URL',
        body: 'The interface is a single field and a result, because anything more is a reason to give up.',
      },
      {
        title: 'Document the sharp edges',
        body: 'Referrer policy, rate limits and what Drive will refuse are written down rather than discovered.',
      },
    ],
    screens: [
      { label: 'Converter', caption: 'Turns a Drive link into a usable media URL in one paste.' },
      { label: 'Result', caption: 'Shows the live preview next to the URL so the link is verified before it is used.' },
      { label: 'Formats', caption: 'Explains which sizes and transforms are available and how to ask for them.' },
      { label: 'Docs', caption: 'Covers the referrer and caching gotchas that break Drive hotlinking in production.' },
    ],
    buildNotes: [
      'Next.js and TypeScript, deployed on Vercel.',
      'Pure client-side URL transformation - no upload, no proxy, no stored user data.',
      'Documents the no-referrer requirement, which is what makes Drive images load cross-origin at all.',
      'MIT licensed with the source public on GitHub.',
      'Responsive single-column interface; the tool is one field, so it needs no layout system.',
    ],
    pagesDelivered: ['Converter', 'Documentation', 'GitHub repository'],
    paletteNames: ['Cloud white', 'Drive blue', 'Ink'],
'@

foreach ($id in $blocks.Keys) {
  $anchor = "    id: '" + $id + "',"
  if (-not $t.Contains($anchor)) {
    $log += "MISS anchor $id"
    continue
  }
  # Idempotent: a second run must not stack two copies of the block.
  $marker = $anchor + "`n" + "    client:"
  if ($t.Replace("`r`n", "`n").Contains($marker)) {
    $log += "SKIP already filled $id"
    continue
  }
  $t = $t.Replace($anchor, $anchor + "`r`n" + $blocks[$id].Replace("`n", "`r`n").TrimEnd())
  $log += "OK   $id"
}

[IO.File]::WriteAllText($path, $t, (New-Object Text.UTF8Encoding($false)))
$log += 'bytes: ' + (Get-Item $path).Length
$log | Out-File -Encoding ascii datalog.txt
