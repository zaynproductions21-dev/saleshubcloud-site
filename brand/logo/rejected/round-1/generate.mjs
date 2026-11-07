// Generates the SalesHub Cloud concept SVGs on exact grids. Run: node generate.mjs
import { writeFileSync } from 'node:fs'

const here = new URL('.', import.meta.url).pathname
const f = n => +n.toFixed(2)
const pt = (cx, cy, rx, ry, deg) => [f(cx + rx * Math.cos((deg * Math.PI) / 180)), f(cy + ry * Math.sin((deg * Math.PI) / 180))]
const write = (name, body) => writeFileSync(here + name, body.trim() + '\n')
const ACC = 'var(--accent, currentColor)'

// ── A · One line through "hub" ─────────────────────────────────────────────
// Monoline lowercase. x-height centreline 35→75 (outer 30→80), ascender 5, stroke 10, bowls r=20.
// h, u and b share strokes: the h's arch runs straight into the u's bowl, whose right side rises into the b stem.
{
  const W = 10, R = 20, CY = 55
  const ink = [], acc = []
  const s = cx => {
    const [x1, y1] = pt(cx, 45, 15, 10, -25), [x2, y2] = pt(cx, 65, 15, 10, 155)
    ink.push(`M${x1} ${y1}A15 10 0 1 0 ${cx} 55A15 10 0 1 1 ${x2} ${y2}`)
  }
  const a = cx => ink.push(`M${cx + R} ${CY}A${R} ${R} 0 1 0 ${cx - R} ${CY}A${R} ${R} 0 1 0 ${cx + R} ${CY}`, `M${cx + R} 35V75`)
  const l = x => ink.push(`M${x} 5V75`)
  const e = cx => { const [x2, y2] = pt(cx, CY, R, R, 45); ink.push(`M${cx - R} ${CY}H${cx + R}A${R} ${R} 0 1 0 ${x2} ${y2}`) }
  // hub: h stem · arch → u bowl → shared stem with b · b bowl
  const hub = x => acc.push(
    `M${x} 5V75`,
    `M${x} ${CY}A${R} ${R} 0 0 1 ${x + 2 * R} ${CY}A${R} ${R} 0 0 0 ${x + 4 * R} ${CY}`,
    `M${x + 4 * R} 5V75`,
    `M${x + 4 * R} ${CY}A${R} ${R} 0 1 0 ${x + 6 * R} ${CY}A${R} ${R} 0 1 0 ${x + 4 * R} ${CY}`,
  )
  s(20); a(74); l(111); e(152); s(208); hub(245)
  const g = `fill="none" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round"`
  write('01-one-line.lockup.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 374 84" role="img" aria-label="SalesHub Cloud">
  <path d="${ink.join('')}" stroke="currentColor" ${g}/>
  <path d="${acc.join('')}" stroke="${ACC}" ${g}/>
</svg>`)
  // Icon: the h → u join on its own, the u's right side ending in the accent.
  write('01-one-line.icon.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="SalesHub Cloud">
  <g fill="none" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 5V43M7 29A8.5 8.5 0 0 1 24 29" stroke="currentColor"/>
    <path d="M24 29A8.5 8.5 0 0 0 41 29V18" stroke="${ACC}"/>
  </g>
</svg>`)
  write('01-one-line.notes.md', `Constructed monoline wordmark: h, u and b share their strokes, so "hub" is drawn as one unbroken line, the way a case is carried from enquiry to retainer.
Risk: without the h's right leg the join can read as a wave; it has to read as letters first.`)
}

// ── B · Joined H (rejected at the contact sheet: reads as an N in mono; kept here) ──
// Two stems; the crossbar is an S-curve stepping down from left to right. SH in one form.
{
  const mark = `<g fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 7V41M37 7V41" stroke="currentColor"/>
    <path d="M11 18C25 18 23 30 37 30" stroke="${ACC}"/>
  </g>`
  write('02-joined-h.icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="SalesHub Cloud">${mark}</svg>`)
  write('02-joined-h.lockup.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 296 48" role="img" aria-label="SalesHub Cloud">
  ${mark}
  <text x="54" y="34" font-family="'Schibsted Grotesk', sans-serif" font-size="29" letter-spacing="-0.6" fill="currentColor"><tspan font-weight="700">SalesHub</tspan><tspan font-weight="400" dx="7" opacity="0.62">Cloud</tspan></text>
</svg>`)
  write('02-joined-h.notes.md', `An H whose crossbar is an S-curve stepping from one side to the other: SalesHub's initials in one form, the firm and the client joined.
Risk: the stepped bar could read as an N, or the curve as a wave.`)
}

// ── C · The bundle ─────────────────────────────────────────────────────────
// A case file with three index tabs down its edge; the last tab, the stage the case has reached, is the accent.
{
  const tab = (y, fill) => `<path d="M33 ${y}H39A2.5 2.5 0 0 1 41.5 ${y + 2.5}V${y + 5.5}A2.5 2.5 0 0 1 39 ${y + 8}H33Z" fill="${fill}"/>`
  const mark = `<rect x="8" y="7" width="22" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="4.5"/>
  ${tab(9, 'currentColor')}${tab(20, 'currentColor')}${tab(31, ACC)}`
  write('03-bundle.icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="SalesHub Cloud">${mark}</svg>`)
  write('03-bundle.lockup.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 48" role="img" aria-label="SalesHub Cloud">
  ${mark}
  <text x="54" y="34" font-family="'Instrument Sans', sans-serif" font-size="29" letter-spacing="-0.5" fill="currentColor"><tspan font-weight="700">SalesHub</tspan><tspan font-weight="400" dx="7" opacity="0.62">Cloud</tspan></text>
</svg>`)
  write('03-bundle.notes.md', `The case file with its index tabs: each tab a stage, the accent tab the stage this case has reached. The object every caseworker already handles.
Risk: could read as a generic document or a filing-cabinet icon.`)
}

// ── D · Signed ─────────────────────────────────────────────────────────────
// A serif wordmark resting on a flat accent rule: the signature line of the retainer the pipeline exists to reach.
{
  write('04-signed.icon.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="SalesHub Cloud">
  <text x="24" y="33" text-anchor="middle" font-family="'Source Serif 4', serif" font-weight="600" font-size="40" fill="currentColor">S</text>
  <rect x="8" y="38" width="32" height="4" fill="${ACC}"/>
</svg>`)
  write('04-signed.lockup.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 52" role="img" aria-label="SalesHub Cloud">
  <text x="0" y="34" font-family="'Source Serif 4', serif" font-size="38" letter-spacing="-0.6" fill="currentColor"><tspan font-weight="600">SalesHub</tspan><tspan font-weight="400" dx="8" font-style="italic" opacity="0.62">Cloud</tspan></text>
  <rect x="1" y="44" width="160" height="3.5" fill="${ACC}"/>
</svg>`)
  write('04-signed.notes.md', `A serif wordmark on a flat accent rule: the signature line of the retainer, in the voice of a firm's letterhead.
Risk: unmodified type plus an underline is close to the un-designed default; it needs one custom glyph.`)
}
console.log('ok')
