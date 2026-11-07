// Round 2 of the SalesHub Cloud concepts: heavier, solid marks drawn from the product's own objects.
// Round 1 (thin monoline, serif, outline file) is in ../rejected/round-1/. Run: node generate.mjs
import { writeFileSync } from 'node:fs'

const here = new URL('.', import.meta.url).pathname
const write = (name, body) => writeFileSync(here + name, body.trim() + '\n')
const ACC = 'var(--accent, currentColor)'
const svg48 = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="SalesHub Cloud">${body}</svg>`
// Mark on the 48 grid + "SalesHub" heavy and "Cloud" regular, in a chosen grotesk.
const lockup = (mark, family, w) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 48" role="img" aria-label="SalesHub Cloud">
  ${mark}
  <text x="56" y="34" font-family="'${family}', sans-serif" font-size="29" letter-spacing="-0.7" fill="currentColor"><tspan font-weight="800">SalesHub</tspan><tspan font-weight="400" dx="7" opacity="0.62">Cloud</tspan></text>
</svg>`

// ── 05 · Card across the board ─────────────────────────────────────────────
// An H made of two board columns with a case card laid across them; a 2-unit paper gap separates card and columns.
{
  const mark = `<mask id="m05"><rect width="48" height="48" fill="#fff"/><rect x="10" y="16" width="28" height="16" rx="5" fill="#000"/></mask>
  <g mask="url(#m05)" fill="currentColor"><rect x="5" y="5" width="11" height="38" rx="4"/><rect x="32" y="5" width="11" height="38" rx="4"/></g>
  <rect x="12" y="18" width="24" height="12" rx="3.5" fill="${ACC}"/>`
  write('05-card-across.icon.svg', svg48(mark))
  write('05-card-across.lockup.svg', lockup(mark, 'Manrope', 300))
  write('05-card-across.notes.md', `Two kanban columns and a case card laid across them make the H of Hub: the card is the case being moved between stages.
Risk: in mono the card merges into a plain H unless the paper gap survives.`)
}

// ── 06 · Moving through stages ─────────────────────────────────────────────
// Three cards, each one stage further right; the last (the signed case) in the accent.
{
  const mark = `<rect x="5" y="6" width="25" height="10" rx="3.5" fill="currentColor"/>
  <rect x="11.5" y="19" width="25" height="10" rx="3.5" fill="currentColor"/>
  <rect x="18" y="32" width="25" height="10" rx="3.5" fill="${ACC}"/>`
  write('06-stages.icon.svg', svg48(mark))
  write('06-stages.lockup.svg', lockup(mark, 'Figtree', 298))
  write('06-stages.notes.md', `Three case cards, each a stage further along, the last one signed: the pipeline in one glance.
Risk: could read as stairs, a menu icon or a bar chart on its side.`)
}

// ── 07 · Case folder (rejected: a stock folder icon; writes to ../rejected/round-2/) ──
// A solid case folder; the tab is the accent, a cut across the top makes the front flap.
{
  // Front flap: drawn as a knock-out so it works on any background.
  const flap = `<mask id="m07"><rect width="48" height="48" fill="#fff"/><path d="M5 21H43" stroke="#000" stroke-width="2.5"/></mask>
  <path d="M5 13A4 4 0 0 1 9 9H18L22 13Z" fill="${ACC}"/>
  <path mask="url(#m07)" d="M5 15H39A4 4 0 0 1 43 19V36A4 4 0 0 1 39 40H9A4 4 0 0 1 5 36Z" fill="currentColor"/>`
  write('../rejected/round-2/07-case-folder.icon.svg', svg48(flap))
  write('../rejected/round-2/07-case-folder.lockup.svg', lockup(flap, 'Plus Jakarta Sans', 306))
  write('../rejected/round-2/07-case-folder.notes.md', `The case folder every caseworker opens all day, solid, with the tab in the accent: everything about the matter in one place.
Risk: a folder is close to a stock icon; it lives on proportion and the accent tab.`)
}

// ── 08 · Heavy S ───────────────────────────────────────────────────────────
// A squared, heavy S on the grid with flat terminals: the top half (sales) in ink, the bottom half (the case) in the accent.
{
  const g = `fill="none" stroke-width="8" stroke-linecap="butt" stroke-linejoin="round"`
  const mark = `<path d="M39 10H18A7 7 0 0 0 18 24H24" stroke="currentColor" ${g}/>
  <path d="M24 24H30A7 7 0 0 1 30 38H9" stroke="${ACC}" ${g}/>`
  write('08-heavy-s.icon.svg', svg48(mark))
  write('08-heavy-s.lockup.svg', lockup(mark, 'Archivo', 296))
  write('08-heavy-s.notes.md', `A heavy, squared S built on the grid: the enquiry half in ink hands over to the case half in teal at the centre.
Risk: S monograms are common; the squared geometry and the hand-over point have to make it ownable.`)
}
console.log('ok')
