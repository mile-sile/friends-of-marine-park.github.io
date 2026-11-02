/* ──────────────────────────────────────────────────────────────────────
   Friends of Marine Park · Reef Explorer
   A diver explores a Singapore reef. Swim to each creature, answer a
   question, snap a photo and fill the photo album.
   Plain JS, inline SVG, Web Audio. No build step.
   ────────────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const play = document.getElementById('play');
  if (!play) return;

  /* ── Palette ─────────────────────────────────────────────────────── */
  const C = {
    ink: '#1d2433', cobalt: '#2b4fae', sky: '#9cc4e4', cream: '#f5efe2',
    pink: '#f2a7a0', peach: '#f6c39b', mustard: '#e9c46a', sage: '#b5cfa0',
    clown: '#f2945f', grey: '#b9c7d3', light: '#e3f1f8', sand: '#f1e6cf',
    rock: '#e2dacb', white: '#fffdf7', lilac: '#c9c3e6',
  };
  const W = 3200, H = 1000;               // world size in units

  /* ── Small helpers ───────────────────────────────────────────────── */
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const f1 = (n) => Math.round(n * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const anim = (node, frames, opts) => {
    if (!node.animate) return Promise.resolve();
    const a = node.animate(frames, opts);
    return a.finished.catch(() => {});
  };
  const ink = (inner, sw = 4) =>
    `<g stroke="${C.ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;
  /* Outlined "tubes": all ink strokes first, then colour on top, so joints merge cleanly */
  const tubes = (paths, color, w) =>
    paths.map((d) => `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${f1(w + 5)}"/>`).join('') +
    paths.map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f1(w)}"/>`).join('');

  const sandY = (x) => 880 + 14 * Math.sin(x / 260) + 8 * Math.sin(x / 97 + 1.3);

  /* ── Creature art (each in its own viewBox) ──────────────────────── */
  const ART = {};

  ART.brain = { vb: '0 0 220 140', svg: `
    <path d="M10 134 C10 52 58 12 110 12 C162 12 210 52 210 134 Z" fill="${C.pink}"/>
    <g fill="none" stroke-width="3.2">
      <path d="M34 122 C34 96 54 86 64 104 S86 114 92 86 S112 56 128 76 S150 104 164 84 S186 76 188 116"/>
      <path d="M52 62 C68 42 90 48 98 30"/><path d="M120 28 C134 44 152 36 166 56"/>
      <path d="M26 98 C30 78 44 70 50 56"/><path d="M98 128 C102 106 124 104 130 126"/>
      <path d="M148 128 C150 112 172 106 192 122"/><path d="M70 72 C80 60 92 66 100 56"/>
      <path d="M138 60 C150 70 168 70 178 84"/>
    </g>
    <path d="M4 134 H216"/>` };

  ART.mushroom = { vb: '0 0 160 90', svg: (() => {
    let s = `<ellipse cx="80" cy="56" rx="74" ry="28" fill="${C.peach}"/>`;
    s += '<g stroke-width="2.4">';
    for (let a = 0; a < 360; a += 18) {
      const r = (a * Math.PI) / 180;
      s += `<path d="M${f1(80 + 13 * Math.cos(r))} ${f1(52 + 5 * Math.sin(r))} L${f1(80 + 66 * Math.cos(r))} ${f1(56 + 23 * Math.sin(r))}"/>`;
    }
    s += '</g>';
    s += `<ellipse cx="80" cy="52" rx="13" ry="5" fill="${C.pink}" stroke-width="3"/>`;
    return s;
  })() };

  ART.anemone = { vb: '0 0 200 200', svg: (() => {
    let s = `<path d="M70 196 C72 158 78 136 82 122 L118 122 C122 136 128 158 130 196 Z" fill="${C.peach}"/>
      <path d="M77 152 H123 M74 174 H126" fill="none" stroke-width="2.5"/>`;
    const p = [];
    for (let i = 0; i < 14; i++) {
      const t = i / 13, ang = ((-78 + 156 * t) * Math.PI) / 180;
      const bx = 58 + 84 * t, by = 120, len = 56 + (i % 3) * 9;
      const tx = bx + Math.sin(ang) * len, ty = by - Math.cos(ang) * len;
      const cx = bx + Math.sin(ang) * len * 0.5 + (i % 2 ? 11 : -11), cy = by - Math.cos(ang) * len * 0.55;
      p.push(`M${f1(bx)} ${by} Q${f1(cx)} ${f1(cy)} ${f1(tx)} ${f1(ty)}`);
    }
    s += tubes(p, C.pink, 9);
    s += `<ellipse cx="100" cy="122" rx="46" ry="10" fill="${C.pink}"/>`;
    s += `<g transform="translate(-24 -8)">
      <path d="M104 70 L84 56 L86 84 Z" fill="${C.clown}"/>
      <path d="M122 55 Q132 40 144 55" fill="${C.clown}"/>
      <ellipse cx="130" cy="70" rx="30" ry="17" fill="${C.clown}"/>
      <path d="M118 54 Q112 70 118 86 L127 86 Q121 70 127 54 Z" fill="${C.cream}" stroke-width="3"/>
      <path d="M145 56 Q141 70 145 84 L151 81 Q148 70 151 59 Z" fill="${C.cream}" stroke-width="3"/>
      <circle cx="153" cy="66" r="3.2" fill="${C.ink}" stroke="none"/>
      <path d="M154 76 Q157 78 160 75" fill="none" stroke-width="2.5"/>
    </g>`;
    return s;
  })() };

  ART.nudibranch = { vb: '0 0 170 90', svg: `
    ${tubes(['M40 50 L28 24', 'M45 48 L40 20', 'M51 48 L55 22', 'M57 50 L68 28'], C.pink, 5)}
    ${tubes(['M134 47 L137 22', 'M146 49 L155 26'], C.mustard, 5.5)}
    <path d="M10 70 C20 50 60 40 100 42 C130 43 155 50 160 66 C150 78 40 82 10 70 Z" fill="${C.cobalt}"/>
    <path d="M18 70 C60 77 130 75 154 67" fill="none" stroke="${C.mustard}" stroke-width="5"/>
    <g fill="${C.cream}" stroke-width="2.4">
      <circle cx="50" cy="56" r="4.5"/><circle cx="75" cy="51" r="4.5"/><circle cx="100" cy="53" r="4.5"/>
      <circle cx="123" cy="56" r="4.5"/><circle cx="64" cy="63" r="3.5"/><circle cx="89" cy="63" r="3.5"/><circle cx="113" cy="64" r="3.5"/>
    </g>` };

  ART.seahorse = { vb: '0 0 100 160', svg: `
    ${tubes(['M50 110 C46 128 40 138 46 146 C52 154 64 150 62 140 C60 132 52 134 52 140'], C.mustard, 8)}
    <path d="M38 70 Q22 78 37 92 Z" fill="${C.peach}"/>
    <path d="M46 34 C64 30 72 46 70 64 C68 86 62 104 50 114 C40 104 34 86 36 64 C37 48 38 38 46 34 Z" fill="${C.mustard}"/>
    <path d="M42 20 C52 12 64 18 62 30 L86 30 C92 30 92 39 86 39 L60 41 C56 45 46 45 42 39 C38 33 38 24 42 20 Z" fill="${C.mustard}"/>
    <path d="M45 18 L47 9 L52 15 L56 9 L58 18" fill="${C.peach}" stroke-width="3"/>
    <g fill="none" stroke-width="2.5"><path d="M40 58 L66 56"/><path d="M38 72 L67 71"/><path d="M40 86 L64 87"/><path d="M44 100 L58 101"/></g>
    <circle cx="52" cy="28" r="3.2" fill="${C.ink}" stroke="none"/>` };

  ART.turtle = { vb: '0 0 220 170', svg: `
    <path d="M118 58 C138 30 164 14 194 16 C180 36 152 58 136 72 Z" fill="${C.peach}"/>
    <path d="M118 112 C138 140 164 156 194 154 C180 134 152 112 136 98 Z" fill="${C.peach}"/>
    <path d="M50 72 C35 60 18 58 10 64 C20 78 38 82 54 82 Z" fill="${C.peach}"/>
    <path d="M50 98 C35 110 18 112 10 106 C20 92 38 88 54 88 Z" fill="${C.peach}"/>
    <path d="M168 76 C176 66 196 66 206 78 C212 84 210 92 204 96 C196 102 178 102 168 94 Z" fill="${C.peach}"/>
    <circle cx="192" cy="78" r="3.2" fill="${C.ink}" stroke="none"/>
    <ellipse cx="105" cy="85" rx="70" ry="50" fill="${C.mustard}"/>
    <g fill="none" stroke-width="3">
      <path d="M60 85 L80 70 L130 70 L150 85 L130 100 L80 100 Z"/>
      <path d="M105 70 V100 M80 70 L72 40 M105 70 V36 M130 70 L140 40 M80 100 L72 130 M105 100 V134 M130 100 L140 130 M60 85 H35 M150 85 H175"/>
    </g>
    <g fill="${C.peach}" stroke="none"><circle cx="92" cy="54" r="7"/><circle cx="122" cy="116" r="8"/><circle cx="58" cy="102" r="5"/><circle cx="150" cy="62" r="5"/></g>` };

  ART.clam = { vb: '0 0 180 120', svg: `
    <path d="M14 58 C20 28 60 18 90 20 C120 18 160 28 166 58 Z" fill="${C.cobalt}"/>
    <g fill="${C.sky}" stroke-width="2.4"><circle cx="46" cy="42" r="5"/><circle cx="70" cy="32" r="4"/><circle cx="112" cy="31" r="4.5"/><circle cx="136" cy="42" r="5"/><circle cx="92" cy="44" r="3.5"/></g>
    <path d="M70 46 Q90 38 110 46" fill="none" stroke-width="3"/>
    <path d="M8 56 L22 44 L36 60 L50 44 L64 60 L78 44 L90 60 L102 44 L116 60 L130 44 L144 60 L158 44 L172 56 C170 98 130 116 90 116 C50 116 10 98 8 56 Z" fill="${C.cream}"/>
    <g fill="none" stroke-width="2.5"><path d="M90 114 L36 60 M90 114 L64 60 M90 114 V60 M90 114 L116 60 M90 114 L144 60"/></g>` };

  ART.dugong = { vb: '0 0 280 170', svg: `
    <path d="M64 88 C66 66 98 54 146 54 C192 54 222 66 238 78 L262 60 C268 56 274 62 270 68 L254 88 L272 106 C276 112 270 118 264 114 L238 98 C220 112 182 122 134 120 C94 118 62 110 64 88 Z" fill="${C.grey}"/>
    <path d="M68 82 C52 86 38 96 40 110 C42 120 58 122 70 110 Z" fill="${C.grey}"/>
    <ellipse cx="47" cy="111" rx="10" ry="7" fill="#a6b6c5" stroke-width="3"/>
    <path d="M112 112 C110 132 96 142 86 140 C90 128 96 118 102 110 Z" fill="${C.grey}"/>
    <circle cx="82" cy="82" r="3.2" fill="${C.ink}" stroke="none"/>
    <path d="M100 70 C130 62 170 62 200 70" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>` };

  ART.seastar = { vb: '0 0 140 140', svg: (() => {
    const cx = 70, cy = 72, pts = [];
    for (let i = 0; i < 10; i++) {
      const a = ((-90 + 36 * i) * Math.PI) / 180, r = i % 2 ? 28 : 64;
      pts.push(`${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`);
    }
    let s = `<path d="M${pts.join(' L')} Z" fill="${C.peach}" stroke-width="5"/>`;
    for (let i = 0; i < 5; i++) {
      const a = ((-90 + 72 * i) * Math.PI) / 180;
      [[20, 5.5], [36, 5], [50, 4]].forEach(([r, k]) => {
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${k}" fill="${C.ink}" stroke="none"/><circle cx="${f1(x - 1.4)}" cy="${f1(y - 1.4)}" r="1.4" fill="${C.cream}" stroke="none"/>`;
      });
    }
    s += `<circle cx="${cx}" cy="${cy}" r="6.5" fill="${C.ink}" stroke="none"/>`;
    return s;
  })() };

  ART.neptune = { vb: '0 0 160 260', svg: (() => {
    const R = rng(5);
    let dots = '';
    for (let i = 0; i < 46; i++) {
      const y = 40 + R() * 70, half = 62 - (y - 30) * 0.55, x = 80 + (R() * 2 - 1) * half;
      dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + R() * 2)}"/>`;
    }
    for (let i = 0; i < 10; i++) dots += `<circle cx="${f1(77 + R() * 6)}" cy="${f1(140 + R() * 75)}" r="2"/>`;
    return `<path d="M12 22 C40 40 120 40 148 22 C140 80 102 108 90 130 L86 222 C110 228 120 240 120 252 L40 252 C40 240 50 228 74 222 L70 130 C58 108 20 80 12 22 Z" fill="${C.mustard}"/>
      <ellipse cx="80" cy="22" rx="68" ry="13" fill="${C.peach}"/>
      <ellipse cx="80" cy="23" rx="50" ry="7" fill="#d9a441" stroke-width="2.5"/>
      <g fill="none" stroke-width="2">${dots}</g>`;
  })() };

  const artSVG = (id, cls = '') =>
    `<svg viewBox="${ART[id].vb}" class="${cls}" aria-hidden="true" focusable="false">${ink(ART[id].svg)}</svg>`;

  /* ── Diver (side view, facing right) ─────────────────────────────── */
  const DIVER_VB = { x: -60, y: 0, w: 290, h: 110 };
  const DIVER_SVG = `<svg viewBox="${DIVER_VB.x} ${DIVER_VB.y} ${DIVER_VB.w} ${DIVER_VB.h}" aria-hidden="true">${ink(`
    <g transform="translate(62 57)"><g class="leg leg-back">
      ${tubes(['M0 7 L-34 13 L-58 9'], '#e5dac3', 13)}
      <path d="M-56 1 L-110 -3 C-114 5 -112 15 -108 21 L-56 17 Z" fill="${C.sky}"/>
    </g></g>
    <rect x="72" y="16" width="78" height="22" rx="11" fill="${C.sky}"/>
    <rect x="148" y="21" width="10" height="12" rx="3" fill="${C.grey}"/>
    <rect x="56" y="36" width="112" height="36" rx="18" fill="${C.cream}"/>
    <rect x="92" y="36" width="11" height="36" fill="${C.cobalt}"/>
    <g transform="translate(62 57)"><g class="leg leg-front">
      ${tubes(['M0 -7 L-34 -11 L-58 -7'], C.cream, 13)}
      <path d="M-56 -15 L-108 -27 C-114 -17 -114 -5 -110 3 L-56 1 Z" fill="${C.cobalt}"/>
    </g></g>
    <path d="M156 27 C176 20 204 40 198 62" fill="none" stroke-width="3"/>
    ${tubes(['M146 60 L166 74 L184 78'], C.cream, 11)}
    <circle cx="188" cy="78" r="6" fill="${C.peach}"/>
    <circle cx="182" cy="50" r="19" fill="${C.peach}"/>
    <path d="M164 52 C162 36 174 30 186 31 C178 38 174 48 176 63 C170 63 166 58 164 52 Z" fill="${C.cobalt}"/>
    <path d="M178 46 L166 44" stroke-width="3"/>
    <rect x="179" y="38" width="23" height="17" rx="6" fill="${C.light}"/>
    <path d="M184 42 L188 46" stroke="#fff" stroke-width="3"/>
    <circle cx="199" cy="62" r="6" fill="${C.cobalt}"/>`)}</svg>`;

  /* ── Instant camera used in the photo sequence ───────────────────── */
  const CAMERA_SVG = `<svg viewBox="0 0 220 176" aria-hidden="true">${ink(`
    <rect x="8" y="34" width="204" height="134" rx="20" fill="${C.cream}"/>
    <path d="M8 76 V54 A20 20 0 0 1 28 34 H192 A20 20 0 0 1 212 54 V76 Z" fill="${C.sky}"/>
    <rect x="30" y="29" width="160" height="9" rx="4" fill="${C.ink}"/>
    <rect x="8" y="120" width="204" height="16" fill="${C.cobalt}"/>
    <circle cx="110" cy="110" r="42" fill="${C.cream}"/>
    <circle cx="110" cy="110" r="30" fill="${C.cobalt}"/>
    <circle cx="110" cy="110" r="16" fill="${C.ink}"/>
    <circle cx="102" cy="102" r="5" fill="#fff" stroke="none"/>
    <rect x="150" y="46" width="44" height="20" rx="5" fill="${C.light}"/>
    <rect x="26" y="46" width="30" height="20" rx="5" fill="${C.ink}"/>
    <circle cx="186" cy="150" r="8" fill="${C.pink}"/>
    <path d="M26 150 H60" stroke-width="3"/>`)}</svg>`;

  const SPARK_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="${C.mustard}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/></svg>`;
  const BADGE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${C.cream}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  /* ── Creatures, questions and facts ──────────────────────────────── */
  const CREATURES = [
    { id: 'seastar', name: 'Knobbly sea star', x: 270, w: 120, h: 120, sink: 28, bg: C.sand,
      q: 'Where in Singapore can you spot lots of knobbly sea stars at low tide?',
      opts: ['Chek Jawa, Pulau Ubin', 'Marina Bay', 'MacRitchie Reservoir'], a: 0,
      exp: "Chek Jawa's seagrass and sandy flats are famous for knobbly sea stars. Look, but please don't pick them up!" },
    { id: 'dugong', name: 'Dugong', x: 580, y: 690, w: 280, h: 170, bob: { ax: 26, ay: 8, sp: 0.25 }, bg: C.sky,
      q: 'Dugongs graze on seagrass. What is seagrass?',
      opts: ['A type of seaweed', 'A flowering plant', 'A soft coral'], a: 1,
      exp: 'Seagrasses are true flowering plants that live underwater. Singapore has about 12 species, and dugongs are sometimes spotted munching on them!' },
    { id: 'seahorse', name: 'Seahorse', x: 900, y: 700, w: 90, h: 150, bob: { ax: 4, ay: 9, sp: 0.9 }, bg: C.sage,
      q: 'Which seahorse parent gives birth to the babies?',
      opts: ['The mum', 'The dad', 'Neither, they hatch from eggs on the seabed'], a: 1,
      exp: 'Male seahorses carry the eggs in a belly pouch and give birth. Seahorses hide among Singapore’s seagrass meadows and reefs.' },
    { id: 'brain', name: 'Brain coral', x: 1130, w: 220, h: 140, bg: C.sky,
      q: 'About how many species of hard coral are found in Singapore’s waters?',
      opts: ['Around 25', 'Over 250', 'Over 2,500'], a: 1,
      exp: 'Over 250 hard coral species (about a third of the world’s) live in our small waters. Corals are animals, and when seas get too warm they can bleach, so they need our care.' },
    { id: 'anemone', name: 'Clownfish & anemone', x: 1440, w: 200, h: 200, bg: C.light,
      q: 'Why doesn’t the anemone’s sting hurt the clownfish?',
      opts: ['Clownfish have a protective slimy coat', 'Anemones don’t sting at all', 'Clownfish are too fast to be stung'], a: 0,
      exp: 'A special mucus coat protects clownfish. In return, they help keep their anemone clean and chase away fish that nibble it.' },
    { id: 'turtle', name: 'Hawksbill turtle', x: 1700, y: 400, w: 220, h: 170, bob: { ax: 60, ay: 18, sp: 0.18 }, bg: C.sky,
      q: 'What is the hawksbill turtle’s favourite food?',
      opts: ['Sponges', 'Seagrass', 'Plankton'], a: 0,
      exp: 'Hawksbills munch mostly on sponges, helping keep reefs balanced. These critically endangered turtles nest on Singapore’s beaches!' },
    { id: 'mushroom', name: 'Mushroom coral', x: 1730, w: 160, h: 90, sink: 18, bg: C.sand,
      q: 'What’s unusual about mushroom corals?',
      opts: ['They can survive on land', 'They’re not attached to rock and can flip themselves upright', 'They’re actually a fungus'], a: 1,
      exp: 'Most mushroom corals are one giant polyp lying loose on the seabed. If flipped over, they can slowly right themselves!' },
    { id: 'clam', name: 'Giant clam', x: 2010, w: 180, h: 120, bg: C.light,
      q: 'How does a giant clam get much of its food?',
      opts: ['By hunting small fish', 'From tiny algae living in its colourful mantle', 'By eating sand'], a: 1,
      exp: 'Like corals, giant clams host tiny algae that turn sunlight into food. That’s why they open up wide in the sun.' },
    { id: 'nudibranch', name: 'Nudibranch (sea slug)', x: 2430, y: 742, w: 170, h: 90, bg: C.peach,
      q: 'Why are sea slugs (nudibranchs) so brightly coloured?',
      opts: ['To attract food', 'To warn predators they taste bad or are toxic', 'Because they’re sunburnt'], a: 1,
      exp: 'Bright colours shout “don’t eat me!” Many nudibranchs store toxins from the sponges they eat. Singapore’s shores are home to many species.' },
    { id: 'neptune', name: 'Neptune’s cup sponge', x: 2870, w: 160, h: 260, bg: C.sky,
      q: 'Thought to be extinct for over 100 years, where was the Neptune’s cup sponge rediscovered in 2011?',
      opts: ['The Great Barrier Reef', 'Singapore’s waters', 'The Red Sea'], a: 1,
      exp: 'Divers found living Neptune’s cup sponges off Singapore’s Southern Islands. Sponges are animals too!' },
  ];
  CREATURES.forEach((c, i) => {
    c.index = i;
    if (c.y == null) c.y = sandY(c.x) + (c.sink || 8) - c.h / 2;   // sit on the sand
    c.r = Math.max(c.w, c.h) * 0.42 + 55;                            // touch radius
    c.cx = c.x; c.cy = c.y;
  });

  /* ── Background scenery ──────────────────────────────────────────── */
  function staghorn(x, base, sc, color, seed) {
    const R = rng(seed), p = [];
    const br = (x0, y0, ang, len, d) => {
      const x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len;
      p.push(`M${f1(x0)} ${f1(y0)} L${f1(x1)} ${f1(y1)}`);
      if (d > 0) {
        br(x1, y1, ang - 0.38 - R() * 0.25, len * (0.66 + R() * 0.12), d - 1);
        br(x1, y1, ang + 0.34 + R() * 0.25, len * (0.66 + R() * 0.12), d - 1);
      }
    };
    [-0.55, -0.05, 0.5].forEach((a) => br(x, base, a, (46 + R() * 16) * sc, 2));
    return tubes(p, color, 12 * sc);
  }
  function tableCoral(x, base, w, color) {
    const top = base - 118;
    return `${tubes([`M${x} ${base} L${x} ${top + 8}`], C.peach, 18)}
      <path d="M${x - w / 2} ${top} C${x - w / 2} ${top + 26} ${x + w / 2} ${top + 26} ${x + w / 2} ${top} Z" fill="#d6ad55"/>
      <ellipse cx="${x}" cy="${top}" rx="${w / 2}" ry="15" fill="${color}"/>
      <g fill="${C.cream}" stroke-width="2">${[-0.3, -0.1, 0.12, 0.3].map((k) => `<circle cx="${f1(x + k * w)}" cy="${top - 2}" r="3"/>`).join('')}</g>`;
  }
  function seaFan(x, base, h, color) {
    const N = 9, p = [], ends = [];
    for (let i = 0; i < N; i++) {
      const a = ((-62 + (124 * i) / (N - 1)) * Math.PI) / 180, len = h * (0.82 + 0.18 * Math.cos(a * 1.6));
      ends.push([x + Math.sin(a) * len, base - Math.cos(a) * len, a, len]);
      p.push(`M${x} ${base} L${f1(ends[i][0])} ${f1(ends[i][1])}`);
    }
    [0.45, 0.7, 0.93].forEach((k) => {
      p.push('M' + ends.map(([, , a, len]) => `${f1(x + Math.sin(a) * len * k)} ${f1(base - Math.cos(a) * len * k)}`).join(' L'));
    });
    return tubes(p, color, 4.5);
  }
  function rock(x, base, w, h, fill = C.rock) {
    return `<path d="M${x - w / 2} ${base} C${x - w / 2} ${base - h * 0.9} ${x - w * 0.2} ${base - h} ${x} ${base - h} C${x + w * 0.32} ${base - h} ${x + w / 2} ${base - h * 0.7} ${x + w / 2} ${base} Z" fill="${fill}"/>
      <g fill="#cfc5b1" stroke="none"><circle cx="${x - w * 0.18}" cy="${base - h * 0.55}" r="${h * 0.06}"/><circle cx="${x + w * 0.16}" cy="${base - h * 0.4}" r="${h * 0.08}"/><circle cx="${x + w * 0.02}" cy="${base - h * 0.75}" r="${h * 0.05}"/></g>`;
  }
  function spongeTubes(x, base) {
    return [[-34, 110], [0, 140], [34, 96]].map(([dx, h]) => `
      <rect x="${x + dx - 15}" y="${base - h}" width="30" height="${h}" rx="14" fill="${C.lilac}"/>
      <ellipse cx="${x + dx}" cy="${base - h + 8}" rx="9" ry="5" fill="${C.ink}" stroke="none"/>`).join('');
  }
  function softCoral(x, base, color) {
    return `<path d="M${x - 40} ${base} C${x - 50} ${base - 50} ${x - 20} ${base - 70} ${x - 10} ${base - 54} C${x - 4} ${base - 90} ${x + 30} ${base - 86} ${x + 26} ${base - 56} C${x + 50} ${base - 60} ${x + 52} ${base - 20} ${x + 40} ${base} Z" fill="${color}"/>
      <g fill="${C.cream}" stroke-width="2"><circle cx="${x - 22}" cy="${base - 48}" r="3"/><circle cx="${x + 8}" cy="${base - 66}" r="3"/><circle cx="${x + 30}" cy="${base - 36}" r="3"/><circle cx="${x - 4}" cy="${base - 30}" r="3"/></g>`;
  }

  function bgSVG() {
    const R = rng(7);
    let s = '';
    // water surface
    let wave = 'M0 0 H3200 V30';
    for (let x = 3200; x > 0; x -= 80) wave += ` Q${x - 20} 22 ${x - 40} 30 T${x - 80} 30`;
    s += `<path d="${wave} Z" fill="#eef6f8" stroke-width="3"/>`;
    // rocks & corals that sit behind everything
    s += rock(760, sandY(760) + 14, 170, 70);
    s += rock(2430, sandY(2430) + 16, 320, 120);
    s += rock(3060, sandY(3060) + 14, 230, 96);
    s += softCoral(1590, sandY(1590) + 8, C.lilac);
    s += tableCoral(1880, sandY(1880) + 8, 170, C.mustard);
    s += staghorn(1290, sandY(1290) + 8, 0.95, C.peach, 3);
    s += staghorn(2210, sandY(2210) + 8, 1.05, C.sky, 9);
    s += staghorn(3170, sandY(3170) + 8, 0.8, C.pink, 21);
    s += seaFan(2650, sandY(2650) + 8, 210, C.pink);
    s += spongeTubes(2290, sandY(2290) + 8);
    s += softCoral(3000, sandY(3000) + 8, C.peach);
    // sand
    let sand = 'M0 1000 L0 ' + f1(sandY(0));
    for (let x = 40; x <= 3200; x += 40) sand += ` L${x} ${f1(sandY(x))}`;
    s += `<path d="${sand} L3200 1000 Z" fill="${C.sand}" stroke-width="3.5"/>`;
    let dots = '';
    for (let i = 0; i < 260; i++) { const x = R() * 3200; dots += `<circle cx="${f1(x)}" cy="${f1(sandY(x) + 18 + R() * 100)}" r="${f1(1.5 + R() * 2)}"/>`; }
    s += `<g fill="#dccaa4" stroke="none">${dots}</g>`;
    let pebbles = '';
    for (let i = 0; i < 26; i++) { const x = 1050 + R() * 2100; pebbles += `<ellipse cx="${f1(x)}" cy="${f1(sandY(x) + 10 + R() * 30)}" rx="${f1(6 + R() * 8)}" ry="${f1(4 + R() * 4)}"/>`; }
    s += `<g fill="${C.rock}" stroke-width="2.5">${pebbles}</g>`;
    // seagrass meadow on the left
    const blades = [];
    for (let x = 10; x < 1060; x += 9 + R() * 8) {
      const h = 50 + R() * 90 * (x < 980 ? 1 : 0.4), sway = (R() - 0.5) * 40, b = sandY(x) + 10;
      blades.push(`M${f1(x)} ${f1(b)} Q${f1(x + sway * 0.4)} ${f1(b - h / 2)} ${f1(x + sway)} ${f1(b - h)}`);
    }
    s += tubes(blades, C.sage, 6);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="wobble" aria-hidden="true">${ink(s, 3.5)}</svg>`;
  }

  function farSVG() {
    const R = rng(2);
    let hills = 'M0 1000 L0 760';
    for (let x = 0; x <= 3200; x += 200) hills += ` Q${x + 100} ${f1(640 + R() * 120)} ${x + 200} ${f1(730 + R() * 60)}`;
    hills += ' L3200 1000 Z';
    let blobs = '';
    for (let i = 0; i < 14; i++) {
      const x = R() * 3200, y = 720 + R() * 60, s = 30 + R() * 40;
      blobs += `<path d="M${f1(x - s)} ${f1(y + s * 0.4)} Q${f1(x - s)} ${f1(y - s)} ${f1(x)} ${f1(y - s * 0.9)} Q${f1(x + s)} ${f1(y - s)} ${f1(x + s)} ${f1(y + s * 0.4)} Z"/>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <g stroke="${C.ink}" stroke-opacity=".22" stroke-width="3" fill="#b4d0e4">${blobs}<path d="${hills}"/></g></svg>`;
  }

  const fishSVG = (color, n) => {
    let s = '';
    const R = rng(n * 13);
    for (let i = 0; i < n; i++) {
      const ox = (i % 3) * 64 + R() * 20, oy = Math.floor(i / 3) * 40 + (i % 3) * 12 + R() * 10;
      s += `<g transform="translate(${f1(ox)} ${f1(oy)})">
        <path d="M6 17 L-12 5 L-10 29 Z" fill="${color}"/>
        <ellipse cx="22" cy="17" rx="20" ry="12" fill="${color}"/>
        <path d="M16 7 Q18 17 16 27" fill="none" stroke-width="2.5"/>
        <circle cx="33" cy="14" r="2.6" fill="${C.ink}" stroke="none"/></g>`;
    }
    return `<svg viewBox="-16 -4 200 110" aria-hidden="true">${ink(s, 3)}</svg>`;
  };
  const RAY_SVG = `<svg viewBox="0 0 170 80" aria-hidden="true">${ink(`
    <path d="M70 40 C40 40 20 52 4 66" fill="none" stroke-width="3"/>
    <path d="M60 40 C70 14 100 6 130 22 C150 30 162 38 166 40 C162 42 150 50 130 58 C100 74 70 66 60 40 Z" fill="${C.mustard}"/>
    <g fill="${C.cobalt}" stroke="none"><circle cx="96" cy="30" r="4"/><circle cx="112" cy="44" r="4"/><circle cx="90" cy="50" r="3.5"/><circle cx="124" cy="30" r="3"/><circle cx="78" cy="38" r="3"/></g>
    <circle cx="140" cy="36" r="2.6" fill="${C.ink}" stroke="none"/>`, 3)}</svg>`;

  /* ── Sound (all synthesised with Web Audio, no files) ────────────── */
  const Sound = {
    ctx: null, master: null, muted: false,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.ambient();
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
    },
    ok() { return this.ctx && !this.muted; },
    ambient() {
      const c = this.ctx, len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const g = c.createGain(); g.gain.value = 0.22;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
      const lg = c.createGain(); lg.gain.value = 0.1; lfo.connect(lg).connect(g.gain);
      src.connect(lp).connect(g).connect(this.master); src.start(); lfo.start();
      const drone = c.createOscillator(); drone.frequency.value = 55;
      const dg = c.createGain(); dg.gain.value = 0.03; drone.connect(dg).connect(this.master); drone.start();
    },
    tone(f, dur, { type = 'sine', vol = 0.2, to = null, at = 0, attack = 0.01 } = {}) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
    },
    noise(dur, { vol = 0.3, hp = 1000, at = 0 } = {}) {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime + at, len = Math.ceil(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(this.master); src.start(t);
    },
    bubble() { const f = 350 + Math.random() * 350; this.tone(f, 0.09, { to: f * 2.4, vol: 0.06 }); },
    correct() { this.tone(659, 0.25, { type: 'triangle', vol: 0.18 }); this.tone(988, 0.5, { type: 'triangle', vol: 0.16, at: 0.12 }); },
    wrong() { this.tone(330, 0.35, { to: 150, vol: 0.18 }); },
    shutter() { this.noise(0.05, { vol: 0.35, hp: 1800 }); this.noise(0.08, { vol: 0.3, hp: 1200, at: 0.09 }); },
    whir() {
      if (!this.ok()) return;
      const c = this.ctx, t = c.currentTime, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = 95; lp.type = 'lowpass'; lp.frequency.value = 650;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
      g.gain.setValueAtTime(0.06, t + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 22; lg.gain.value = 0.025;
      lfo.connect(lg).connect(g.gain);
      o.connect(lp).connect(g).connect(this.master); o.start(t); lfo.start(t); o.stop(t + 1.2); lfo.stop(t + 1.2);
    },
    pop() { this.tone(520, 0.12, { to: 900, vol: 0.12, type: 'triangle' }); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 3 ? 0.8 : 0.22, { type: 'triangle', vol: 0.16, at: i * 0.13 })); },
  };
  try { Sound.muted = localStorage.getItem('fmp-muted') === '1'; } catch (e) { /* storage unavailable */ }

  /* ── Build the DOM ───────────────────────────────────────────────── */
  const hero = document.getElementById('hero');
  const world = document.getElementById('world');
  const far = document.getElementById('far');
  const hud = document.getElementById('hud');
  const slotsEl = document.getElementById('slots');
  const countEl = document.getElementById('album-count');
  const qOverlay = document.getElementById('q-overlay');
  const qCard = document.getElementById('qcard');
  const doneOverlay = document.getElementById('done-overlay');
  const doneGrid = document.getElementById('done-grid');
  const photoLayer = document.getElementById('photo-layer');
  const muteBtn = document.getElementById('mute');
  const particles = document.getElementById('particles');

  far.innerHTML = farSVG();
  const bg = el('div', 'bg', bgSVG());
  world.appendChild(bg);

  CREATURES.forEach((c) => {
    c.el = el('div', 'sprite hotspot', artSVG(c.id, 'wobble') + `<span class="spark">${SPARK_SVG}</span><span class="badge">${BADGE_SVG}</span>`);
    world.appendChild(c.el);
    const s = el('div', 'slot', String(c.index + 1));
    slotsEl.appendChild(s);
    c.slot = s;
  });

  const SCHOOLS = [
    { svg: fishSVG(C.sky, 5), x0: 450, x1: 1350, y: 300, w: 200, h: 110, sp: 70 },
    { svg: fishSVG(C.mustard, 4), x0: 1450, x1: 2350, y: 590, w: 200, h: 110, sp: 85 },
    { svg: fishSVG(C.pink, 6), x0: 2200, x1: 3100, y: 330, w: 200, h: 110, sp: 60 },
    { svg: RAY_SVG, x0: 1900, x1: 2900, y: 905, w: 170, h: 80, sp: 45 },
  ].map((s, i) => {
    s.el = el('div', 'sprite', s.svg); world.appendChild(s.el);
    s.x = s.x0 + (s.x1 - s.x0) * ((i * 0.37) % 1); s.dir = i % 2 ? -1 : 1; s.boost = 0;
    return s;
  });

  const diverEl = el('div', 'sprite diver', DIVER_SVG);
  world.appendChild(diverEl);

  for (let i = 0; i < 22; i++) {
    const p = el('i');
    p.style.left = (Math.random() * 100).toFixed(1) + '%';
    p.style.animationDuration = (9 + Math.random() * 10).toFixed(1) + 's';
    p.style.animationDelay = (-Math.random() * 18).toFixed(1) + 's';
    const s = (2 + Math.random() * 4).toFixed(1) + 'px'; p.style.width = s; p.style.height = s;
    particles.appendChild(p);
  }

  /* ── State ───────────────────────────────────────────────────────── */
  const START = { x: 560, y: 500 };
  const st = {
    scale: 1, viewW: 0, viewH: 0, camX: 0, ds: 0.8,
    d: { x: START.x, y: START.y, vx: 0, vy: 0, face: 1, tilt: 0 },
    pointer: null, keys: new Set(), busy: false, started: false,
    found: new Set(), inside: null, lastBubble: 0, lastBubbleSound: 0, t: 0, visible: true,
  };
  const bubbles = [];

  function layout() {
    const r = play.getBoundingClientRect();
    st.viewW = r.width; st.viewH = r.height;
    st.scale = Math.max(st.viewH / H, st.viewW / W);
    st.ds = st.viewW < 600 ? 0.62 : 0.95;
    const s = st.scale;
    world.style.width = W * s + 'px'; world.style.height = H * s + 'px';
    far.style.width = W * s + 'px'; far.style.height = H * s + 'px';
    bg.style.width = W * s + 'px'; bg.style.height = H * s + 'px';
    far.firstElementChild.style.cssText = `width:${W * s}px;height:${H * s}px`;
    bg.firstElementChild.style.cssText = `width:${W * s}px;height:${H * s}px`;
    CREATURES.forEach((c) => { c.el.style.width = c.w * s + 'px'; c.el.style.height = c.h * s + 'px'; placeCreature(c); });
    SCHOOLS.forEach((f) => { f.el.style.width = f.w * s + 'px'; f.el.style.height = f.h * s + 'px'; });
    diverEl.style.width = DIVER_VB.w * st.ds * s + 'px';
    diverEl.style.height = DIVER_VB.h * st.ds * s + 'px';
  }
  function placeCreature(c) {
    const s = st.scale;
    c.el.style.transform = `translate3d(${f1((c.cx - c.w / 2) * s)}px, ${f1((c.cy - c.h / 2) * s)}px, 0)`;
  }

  /* ── Input ───────────────────────────────────────────────────────── */
  const markStart = () => { Sound.init(); };
  play.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || st.pointer) st.pointer = { x: e.clientX, y: e.clientY, type: e.pointerType };
  });
  play.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a, .qcard')) return;
    markStart();
    st.keys.clear();
    st.pointer = { x: e.clientX, y: e.clientY, type: e.pointerType };
  });
  play.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') st.pointer = null; });

  const KEYMAP = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
  const heroActive = () => { const r = hero.getBoundingClientRect(); return r.bottom > window.innerHeight * 0.45 && r.top < window.innerHeight * 0.5; };
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.key];
    if (!k || st.busy || !heroActive()) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    e.preventDefault();
    markStart();
    st.keys.add(k); st.pointer = null;
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.key]; if (k) st.keys.delete(k); });
  window.addEventListener('blur', () => st.keys.clear());

  function pointerWorld() {
    const r = play.getBoundingClientRect(), p = st.pointer;
    const lift = p.type === 'touch' ? 55 : 0;   // keep the diver visible above the finger
    return { x: (p.x - r.left) / st.scale + st.camX, y: (p.y - r.top - lift) / st.scale };
  }

  /* ── Mute ────────────────────────────────────────────────────────── */
  const SPK = (on) => `<svg viewBox="0 0 24 24" fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="${C.sky}"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`;
  const renderMute = () => { muteBtn.innerHTML = SPK(!Sound.muted); muteBtn.setAttribute('aria-label', Sound.muted ? 'Unmute sound' : 'Mute sound'); };
  muteBtn.addEventListener('click', () => {
    Sound.setMuted(!Sound.muted); Sound.init();
    try { localStorage.setItem('fmp-muted', Sound.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    renderMute();
  });
  renderMute();

  /* ── Question card ───────────────────────────────────────────────── */
  function openQuestion(c) {
    st.busy = true; st.keys.clear();
    qCard.innerHTML = `
      <button class="q-close" aria-label="Close and keep exploring">✕</button>
      <div class="q-top">
        <div class="q-art" style="background:${c.bg}">${artSVG(c.id)}</div>
        <div><p class="q-kicker">You found a creature!</p><p class="q-name" id="q-name">${c.name}</p></div>
      </div>
      <p class="q-text">${c.q}</p>
      <div class="q-opts">${c.opts.map((o, i) => `<button class="q-opt" data-i="${i}"><span class="k">${'ABC'[i]}</span><span>${o}</span></button>`).join('')}</div>
      <div class="q-result"></div>`;
    qOverlay.hidden = false;
    const first = qCard.querySelector('.q-opt');
    if (first) first.focus({ preventScroll: true });

    qCard.querySelector('.q-close').onclick = closeQuestion;
    qCard.querySelectorAll('.q-opt').forEach((b) => {
      b.onclick = () => answer(c, Number(b.dataset.i));
    });
  }
  function answer(c, i) {
    Sound.init();
    const right = i === c.a;
    qCard.querySelectorAll('.q-opt').forEach((b, j) => {
      b.disabled = true;
      if (j === c.a) b.classList.add('correct');
      else if (j === i) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    right ? Sound.correct() : Sound.wrong();
    const res = qCard.querySelector('.q-result');
    res.innerHTML = `
      <div class="q-feedback"><strong>${right ? 'Correct! 🎉' : 'Not quite! The answer is: ' + c.opts[c.a]}</strong>${c.exp}</div>
      <div class="q-actions"><button class="btn" id="snap">📸 Take a photo</button></div>`;
    qCard.querySelector('.q-close').hidden = true;
    const snap = res.querySelector('#snap');
    snap.focus({ preventScroll: true });
    snap.onclick = () => { qOverlay.hidden = true; snapPhoto(c); };
  }
  function closeQuestion() {
    qOverlay.hidden = true; st.busy = false; st.pointer = null;
  }

  /* ── Photo sequence: viewfinder → flash → camera prints → into album ── */
  const polaroidHTML = (c, dev) =>
    `<div class="ph" style="background:${c.bg}">${artSVG(c.id)}${dev ? '<div class="dev"></div>' : ''}</div><div class="cap">${c.name}</div>`;

  async function snapPhoto(c) {
    st.busy = true;
    const rect = c.el.getBoundingClientRect(), pad = 16;
    const vf = el('div', 'viewfinder', '<i></i><i></i><i></i><i></i>');
    Object.assign(vf.style, { left: rect.left - pad + 'px', top: rect.top - pad + 'px', width: rect.width + pad * 2 + 'px', height: rect.height + pad * 2 + 'px' });
    photoLayer.appendChild(vf);
    await anim(vf, [{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
    await wait(260);

    Sound.shutter();
    const flash = el('div', 'flash');
    photoLayer.appendChild(flash);
    anim(flash, [{ opacity: 0 }, { opacity: 0.95, offset: 0.15 }, { opacity: 0 }], { duration: 560 }).then(() => flash.remove());
    await wait(170);
    vf.remove();

    const rig = el('div', 'camera-rig', `<div class="pol-clip"><div class="polaroid">${polaroidHTML(c, true)}</div></div><div class="camera">${CAMERA_SVG}</div>`);
    photoLayer.appendChild(rig);
    const pol = rig.querySelector('.polaroid'), dev = rig.querySelector('.dev');
    await anim(rig, [{ transform: 'translateY(160%)' }, { transform: 'translateY(0)' }], { duration: 480, easing: 'cubic-bezier(.2,1.25,.4,1)', fill: 'forwards' });

    Sound.whir();
    anim(dev, [{ opacity: 1 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 1900, fill: 'forwards' });
    await anim(pol, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 1150, easing: 'cubic-bezier(.35,.1,.3,1)', fill: 'forwards' });
    await wait(650);

    // Lift the photo out of the camera, then send it to its album slot
    const pr = pol.getBoundingClientRect();
    pol.getAnimations && pol.getAnimations().forEach((a) => a.cancel());
    Object.assign(pol.style, { position: 'fixed', left: pr.left + 'px', top: pr.top + 'px', width: pr.width + 'px', bottom: 'auto', margin: 0, transform: 'none' });
    photoLayer.appendChild(pol);
    anim(rig, [{ transform: 'translateY(0)' }, { transform: 'translateY(170%)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' }).then(() => rig.remove());

    const sr = c.slot.getBoundingClientRect();
    const dx = sr.left + sr.width / 2 - (pr.left + pr.width / 2);
    const dy = sr.top + sr.height / 2 - (pr.top + pr.height / 2);
    const sc = sr.width / pr.width;
    await anim(pol, [
      { transform: 'translate(0,0) rotate(0deg) scale(1)' },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 50}px) rotate(-10deg) scale(${(1 + sc) / 1.7})`, offset: 0.4 },
      { transform: `translate(${dx}px, ${dy}px) rotate(4deg) scale(${sc})` },
    ], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
    pol.remove();

    collect(c);
  }

  function miniPolaroid(c) {
    return `<div class="mini-polaroid"><div class="ph" style="background:${c.bg}">${artSVG(c.id)}</div></div>`;
  }
  function collect(c) {
    st.found.add(c.id);
    c.el.classList.add('found');
    c.slot.classList.add('filled');
    c.slot.innerHTML = miniPolaroid(c);
    c.slot.setAttribute('title', c.name);
    countEl.textContent = `${st.found.size} / ${CREATURES.length}`;
    Sound.pop();
    st.busy = false; st.pointer = null;
    if (st.found.size === CREATURES.length) setTimeout(showDone, 700);
  }

  function showDone() {
    st.busy = true;
    doneGrid.innerHTML = CREATURES.map((c) => `<div class="slot filled" title="${c.name}">${miniPolaroid(c)}</div>`).join('');
    doneOverlay.hidden = false;
    Sound.fanfare();
    document.getElementById('done-replay').focus({ preventScroll: true });
  }
  document.getElementById('done-replay').addEventListener('click', () => {
    st.found.clear();
    CREATURES.forEach((c) => { c.el.classList.remove('found'); c.slot.classList.remove('filled'); c.slot.textContent = String(c.index + 1); c.slot.removeAttribute('title'); });
    countEl.textContent = `0 / ${CREATURES.length}`;
    Object.assign(st.d, { x: START.x, y: START.y, vx: 0, vy: 0 });
    st.camX = 0; st.inside = null; st.pointer = null;
    doneOverlay.hidden = true; st.busy = false;
  });
  document.getElementById('done-involve').addEventListener('click', () => { doneOverlay.hidden = true; st.busy = false; });

  /* ── Bubbles ─────────────────────────────────────────────────────── */
  function spawnBubble(x, y, size) {
    const b = { el: el('div', 'sprite bubble'), x, y, size, age: 0, life: 2.2 + Math.random(), ph: Math.random() * 6 };
    const px = size * st.scale;
    b.el.style.width = px + 'px'; b.el.style.height = px + 'px';
    world.appendChild(b.el);
    bubbles.push(b);
  }

  /* ── Main loop ───────────────────────────────────────────────────── */
  const MAX_SPEED = 430;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (st.visible) { update(dt); render(); }
    requestAnimationFrame(frame);
  }

  function update(dt) {
    st.t += dt;
    const d = st.d;
    let dvx = 0, dvy = 0;
    if (!st.busy) {
      if (st.keys.size) {
        const kx = (st.keys.has('r') ? 1 : 0) - (st.keys.has('l') ? 1 : 0);
        const ky = (st.keys.has('d') ? 1 : 0) - (st.keys.has('u') ? 1 : 0);
        const m = Math.hypot(kx, ky) || 1;
        dvx = (kx / m) * MAX_SPEED; dvy = (ky / m) * MAX_SPEED;
      } else if (st.pointer) {
        const tgt = pointerWorld();
        const dx = tgt.x - d.x, dy = tgt.y - d.y, dist = Math.hypot(dx, dy);
        if (dist > 14) { const sp = Math.min(MAX_SPEED, dist * 2.6); dvx = (dx / dist) * sp; dvy = (dy / dist) * sp; }
      }
    }
    const k = Math.min(1, dt * 4);
    d.vx += (dvx - d.vx) * k; d.vy += (dvy - d.vy) * k;
    d.x = clamp(d.x + d.vx * dt, 90, W - 90);
    d.y = clamp(d.y + d.vy * dt, 110, 850);
    const speed = Math.hypot(d.vx, d.vy);
    if (Math.abs(d.vx) > 25) d.face = d.vx > 0 ? 1 : -1;
    const tiltTarget = clamp(d.vy / MAX_SPEED, -1, 1) * 24 * d.face;
    d.tilt += (tiltTarget - d.tilt) * Math.min(1, dt * 6);
    diverEl.classList.toggle('moving', speed > 40);

    if (!st.started && Math.hypot(d.x - START.x, d.y - START.y) > 140) { st.started = true; hud.classList.add('started'); }

    // camera
    const viewU = st.viewW / st.scale;
    const camTarget = clamp(d.x - viewU / 2, 0, Math.max(0, W - viewU));
    st.camX += (camTarget - st.camX) * Math.min(1, dt * 5);

    // moving creatures
    CREATURES.forEach((c) => {
      if (!c.bob) return;
      c.cx = c.x + Math.sin(st.t * c.bob.sp * Math.PI * 2 * 0.5) * c.bob.ax;
      c.cy = c.y + Math.sin(st.t * c.bob.sp * Math.PI * 2) * c.bob.ay;
    });

    // touching a creature?
    let near = null;
    for (const c of CREATURES) {
      if (st.found.has(c.id)) continue;
      if (Math.hypot(d.x - c.cx, d.y - c.cy) < c.r) { near = c; break; }
    }
    if (near && st.inside !== near.id && !st.busy) openQuestion(near);
    st.inside = near ? near.id : null;

    // fish schools swim back and forth and scatter from the diver
    SCHOOLS.forEach((f) => {
      const close = Math.hypot(d.x - (f.x + f.w / 2), d.y - (f.y + f.h / 2)) < 190;
      if (close && f.boost <= 0) { f.dir = d.x < f.x + f.w / 2 ? 1 : -1; f.boost = 1.2; }
      f.boost -= dt;
      f.x += f.dir * f.sp * (f.boost > 0 ? 3.2 : 1) * dt;
      if (f.x > f.x1) { f.x = f.x1; f.dir = -1; }
      if (f.x < f.x0) { f.x = f.x0; f.dir = 1; }
    });

    // bubbles from the regulator
    const mouthX = d.x + d.face * 108 * st.ds, mouthY = d.y + 4;
    const gap = speed > 40 ? 0.28 : 1.1;
    if (st.t - st.lastBubble > gap) {
      st.lastBubble = st.t;
      spawnBubble(mouthX, mouthY, 9 + Math.random() * 10);
      if (Math.random() < 0.5) spawnBubble(mouthX + 6, mouthY - 10, 6 + Math.random() * 6);
      if (st.t - st.lastBubbleSound > 2.2 && Math.random() < 0.6) { st.lastBubbleSound = st.t; Sound.bubble(); }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.age += dt; b.y -= (70 + b.size * 3) * dt; b.x += Math.sin(b.age * 5 + b.ph) * 18 * dt;
      if (b.age > b.life || b.y < 40) { b.el.remove(); bubbles.splice(i, 1); }
    }
  }

  function render() {
    const s = st.scale, d = st.d;
    world.style.transform = `translate3d(${f1(-st.camX * s)}px,0,0)`;
    far.style.transform = `translate3d(${f1(-st.camX * s * 0.5)}px,0,0)`;
    const dw = DIVER_VB.w * st.ds * s, dh = DIVER_VB.h * st.ds * s;
    const bobY = Math.hypot(d.vx, d.vy) < 40 ? Math.sin(st.t * 2) * 5 : 0;
    diverEl.style.transform = `translate3d(${f1(d.x * s - dw / 2)}px, ${f1((d.y + bobY) * s - dh / 2)}px, 0) rotate(${f1(d.tilt)}deg) scaleX(${d.face})`;
    CREATURES.forEach((c) => { if (c.bob) placeCreature(c); });
    SCHOOLS.forEach((f) => { f.el.style.transform = `translate3d(${f1(f.x * s)}px, ${f1(f.y * s)}px, 0) scaleX(${f.dir})`; });
    bubbles.forEach((b) => {
      const o = b.age > b.life - 0.5 ? (b.life - b.age) / 0.5 : 1;
      b.el.style.transform = `translate3d(${f1(b.x * s)}px, ${f1(b.y * s)}px, 0)`;
      b.el.style.opacity = o.toFixed(2);
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; last = performance.now(); }).observe(hero);
  }
  window.addEventListener('resize', layout);
  layout();
  requestAnimationFrame(frame);

  // Expose a tiny hook for automated checks
  window.__reef = { st, CREATURES };
})();
