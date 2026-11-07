# Refinement of 08 Heavy S: the mark becomes the S of the wordmark.
# The rest of the name is Archivo (OFL), outlined from ../fonts with HarfBuzz shaping, so kerning is the font's own.
# Run with a Python that has fonttools + uharfbuzz:  python build.py
import pathlib
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = pathlib.Path(__file__).parent
FONTS = HERE.parent / 'fonts'
ACC = 'var(--accent, currentColor)'
CAP = 687            # Archivo cap height (H bounds), font units
S_LSB, S_W, S_ADV = 44, 613, 697   # Archivo 800 'S': left bearing, ink width, advance


def shape(font_file, text, x, y=0, scale=1.0):
    """Outline `text` at baseline (x, y); returns (path d, advance in output units)."""
    blob = hb.Blob.from_file_path(str(font_file))
    face = hb.Face(blob)
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True, 'liga': True})
    tt = TTFont(font_file)
    gs, order = tt.getGlyphSet(), tt.getGlyphOrder()
    pen = SVGPathPen(gs)
    cx = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        t = TransformPen(pen, (scale, 0, 0, -scale, x + (cx + pos.x_offset) * scale, y - pos.y_offset * scale))
        gs[order[info.codepoint]].draw(t)
        cx += pos.x_advance
    return pen.getCommands(), cx * scale


def s_mark(x0, base, cap, width, t):
    """The 08 squared S as two stroked paths (ink top, accent bottom) in a box x0..x0+width, base-cap..base."""
    top, bot, mid = base - cap + t / 2, base - t / 2, base - cap / 2
    r = (cap - t) / 4
    lx, rx = x0 + t / 2 + r, x0 + width - t / 2 - r
    inset = 0.05 * cap
    mx = (lx + rx) / 2
    f = lambda n: round(n, 1)
    ink = f'M{f(x0 + width - inset)} {f(top)}H{f(lx)}A{f(r)} {f(r)} 0 0 0 {f(lx)} {f(mid)}H{f(mx)}'
    acc = f'M{f(mx)} {f(mid)}H{f(rx)}A{f(r)} {f(r)} 0 0 1 {f(rx)} {f(bot)}H{f(x0 + inset)}'
    g = f'fill="none" stroke-width="{f(t)}" stroke-linecap="butt" stroke-linejoin="round"'
    return f'<path d="{ink}" stroke="currentColor" {g}/><path d="{acc}" stroke="{ACC}" {g}/>'


def lockup(name, s_scale=1.0, t_ratio=0.213, cloud=True):
    cap = CAP * s_scale
    width = S_W * s_scale
    t = cap * t_ratio if s_scale == 1 else CAP * t_ratio * 1.1
    x = S_LSB
    mark = s_mark(x, 0, cap, width, t)
    x += width + (S_ADV - S_LSB - S_W)          # the font's own right bearing after the S
    d, adv = shape(FONTS / 'Archivo-800.ttf', 'alesHub', x)
    x += adv
    parts = [mark, f'<path d="{d}" fill="currentColor"/>']
    if cloud:
        x += 190
        d2, adv2 = shape(FONTS / 'Archivo-400.ttf', 'Cloud', x)
        parts.append(f'<path d="{d2}" fill="currentColor" opacity="0.62"/>')
        x += adv2
    top = -max(cap, 760) - 40
    vb = f'0 {round(top)} {round(x + 44)} {round(-top + 60)}'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="SalesHub Cloud">{"".join(parts)}</svg>\n'
    (HERE / f'{name}.svg').write_text(svg)


lockup('08a-cap-height')                     # S exactly at cap height, stroke matched to Archivo 800
lockup('08b-no-cloud', cloud=False)          # the same, name only, for the nav and app sidebar
lockup('08c-raised', s_scale=1.28)           # S taller than the caps, sitting on the baseline
# The square icon stays the round-2 mark (../concepts/08-heavy-s.icon.svg).

# Comparison sheet: each variant in colour, mono, reversed and at nav height, beside the icon.
icon = (HERE.parent / 'concepts' / '08-heavy-s.icon.svg').read_text()
inl = lambda s, h: s.replace('<svg ', f'<svg style="height:{h}px;width:auto;max-width:100%;display:block" ', 1)
rows = []
for n in ('08a-cap-height', '08b-no-cloud', '08c-raised'):
    s = (HERE / f'{n}.svg').read_text()
    rows.append(f'''<section><h2>{n}</h2>
<div class="row"><div class="c light">{inl(s, 84)}</div><div class="c light mono">{inl(s, 84)}</div></div>
<div class="row"><div class="c dark">{inl(s, 64)}</div><div class="c light nav">{inl(icon, 28)}{inl(s, 24)}<span>Pricing</span><span>Features</span><b>Book a demo</b></div></div>
<div class="row"><div class="c light nav">{inl(s, 28)}<span>Pricing</span><span>Features</span><b>Book a demo</b></div><div class="c dark mono">{inl(s, 40)}</div></div>
</section>''')
(HERE / 'sheet.html').write_text(f'''<!doctype html><meta charset="utf-8"><style>
:root{{--accent:#099C99}}body{{margin:0;padding:32px;background:#f2f2f2;font:14px system-ui;color:#2F2B3D}}
h2{{font-size:15px;margin:0 0 12px}}section{{background:#fff;border-radius:10px;padding:20px;margin-bottom:24px}}
.row{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}}.c{{border-radius:8px;padding:28px;display:flex;align-items:center;gap:12px}}
.c{{min-width:0}}.light{{border:1px solid #e5e5e5;color:#2F2B3D}}.dark{{background:#28243D;color:#fff}}.mono{{--accent:currentColor}}
.nav span{{margin-left:18px;font-size:14px}}.nav b{{margin-left:auto;background:#099C99;color:#fff;padding:8px 14px;border-radius:6px;font-weight:600;font-size:13px}}
</style><body>{"".join(rows)}</body>''')
print('ok')
