# Builds every SalesHub Cloud logo file from one geometry: the heavy S (round-2 concept 08) used as the S of the
# wordmark, with the rest of the name outlined from Archivo (OFL, ../fonts) using HarfBuzz shaping.
#
#   python build.py            write the files in this folder (SVG, PNG, ICO)
#   python build.py --install  also copy the icons to the site root and swap the old logo out of every page
#
# Needs a Python with fonttools, uharfbuzz and pillow, and Google Chrome (for the PNG renders).
import pathlib, re, subprocess, sys, tempfile
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image

HERE = pathlib.Path(__file__).parent
FONTS = HERE.parent / 'fonts'
SITE = HERE.parents[2]
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

INK, ACCENT = '#2F2B3D', '#099C99'          # light grounds (accent 3.37:1 on white)
DARK, ACCENT_DARK = '#28243D', '#0BAEAB'     # dark grounds (accent 5.43:1 on the dark nav)
CAP = 687                                     # Archivo cap height (H), font units
S_LSB, S_W, S_ADV = 44, 613, 697              # Archivo 800 'S': left bearing, ink width, advance
T_RATIO = 0.213                               # S stroke / cap height: matches Archivo 800's horizontals
CLOUD_GAP = 190                               # word space before "Cloud", font units
f = lambda n: round(n, 1)


def shape(font_file, text, x):
    """Outline `text` on baseline y=0 from x; returns (path d, advance, bounds)."""
    font = hb.Font(hb.Face(hb.Blob.from_file_path(str(font_file))))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True, 'liga': True})
    tt = TTFont(font_file)
    gs, order = tt.getGlyphSet(), tt.getGlyphOrder()
    pen, bp, cx = SVGPathPen(gs), BoundsPen(gs), 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        m = (1, 0, 0, -1, x + cx + pos.x_offset, -pos.y_offset)
        gs[order[info.codepoint]].draw(TransformPen(pen, m))
        gs[order[info.codepoint]].draw(TransformPen(bp, m))
        cx += pos.x_advance
    return pen.getCommands(), cx, bp.bounds


def s_paths(x0, base, cap, width, t):
    """The squared S as two stroked centrelines: (ink half, accent half), and the stroke width."""
    top, bot, mid = base - cap + t / 2, base - t / 2, base - cap / 2
    r = (cap - t) / 4
    lx, rx = x0 + t / 2 + r, x0 + width - t / 2 - r
    inset, mx = 0.05 * cap, (lx + rx) / 2
    ink = f'M{f(x0 + width - inset)} {f(top)}H{f(lx)}A{f(r)} {f(r)} 0 0 0 {f(lx)} {f(mid)}H{f(mx)}'
    acc = f'M{f(mx)} {f(mid)}H{f(rx)}A{f(r)} {f(r)} 0 0 1 {f(rx)} {f(bot)}H{f(x0 + inset)}'
    return ink, acc, t


def s_svg(ink_d, acc_d, t, ink, acc):
    g = f'fill="none" stroke-width="{f(t)}" stroke-linecap="butt" stroke-linejoin="round"'
    return f'<path d="{ink_d}" stroke="{ink}" {g}/><path d="{acc_d}" stroke="{acc}" {g}/>'


# ── Wordmark geometry ───────────────────────────────────────────────────────
S_INK, S_ACC, S_T = s_paths(S_LSB, 0, CAP, S_W, CAP * T_RATIO)
x = S_LSB + S_W + (S_ADV - S_LSB - S_W)
NAME_D, adv, nb = shape(FONTS / 'Archivo-800.ttf', 'alesHub', x)
CLOUD_D, adv2, cb = shape(FONTS / 'Archivo-400.ttf', 'Cloud', x + adv + CLOUD_GAP)
X0, Y0 = S_LSB, min(nb[1], cb[1], -CAP)       # tight to the ink: S left edge, tallest ascender
X1, Y1 = cb[2], max(nb[3], cb[3], 0)            # end of "Cloud", deepest overshoot
NAME_X1 = nb[2]


def wordmark(ink, acc, cloud_ink=None, cloud=True, cls=None, opacity=True):
    x1 = X1 if cloud else NAME_X1
    pad = 8
    vb = f'{f(X0 - pad)} {f(Y0 - pad)} {f(x1 - X0 + 2 * pad)} {f(Y1 - Y0 + 2 * pad)}'
    attrs = f' class="{cls}"' if cls else ''
    parts = [s_svg(S_INK, S_ACC, S_T, ink, acc), f'<path d="{NAME_D}" fill="{ink}"/>']
    if cloud:
        op = ' opacity="0.62"' if opacity and not cloud_ink else ''
        parts.append(f'<path d="{CLOUD_D}" fill="{cloud_ink or ink}"{op}/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{attrs} role="img" aria-label="SalesHub Cloud">'
            + ''.join(parts) + '</svg>')


# ── Mark geometry: the same S on the 48 grid (6→42 tall, 7→41 wide, stroke 8) ──
M_INK, M_ACC, M_T = s_paths(7, 42, 36, 34, 8)


def mark(ink, acc, ground=None, size=48, extra=''):
    bg = f'<rect width="48" height="48" fill="{ground}"/>' if ground else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="{size}" height="{size}" role="img" '
            f'aria-label="SalesHub Cloud">{extra}{bg}{s_svg(M_INK, M_ACC, M_T, ink, acc)}</svg>')


def write(name, text):
    (HERE / name).write_text(text + '\n')


write('logo.svg', wordmark(INK, ACCENT))
write('logo-reversed.svg', wordmark('#fff', ACCENT_DARK))
write('logo-mono-black.svg', wordmark('#000', '#000'))
write('logo-mono-white.svg', wordmark('#fff', '#fff'))
write('logo-name-only.svg', wordmark(INK, ACCENT, cloud=False))
write('logo-inline.svg', wordmark('currentColor', 'var(--accent, currentColor)', cls='sh-logo'))
write('mark.svg', mark(INK, ACCENT))
write('mark-mono.svg', mark('currentColor', 'currentColor'))
write('mark-reversed.svg', mark('#fff', ACCENT_DARK))
# Favicon SVG: follows the browser's light or dark tab strip.
style = (f'<style>.i{{stroke:{INK}}}.a{{stroke:{ACCENT}}}@media (prefers-color-scheme:dark)'
         f'{{.i{{stroke:#fff}}.a{{stroke:{ACCENT_DARK}}}}}</style>')
icon = mark('x', 'y', extra=style).replace('stroke="x"', 'class="i"').replace('stroke="y"', 'class="a"')
write('icon.svg', icon)


# ── PNG / ICO renders through headless Chrome ───────────────────────────────
def render(svg, w, h, out, transparent=True):
    with tempfile.TemporaryDirectory() as tmp:
        page = pathlib.Path(tmp) / 'r.html'
        page.write_text(f'<!doctype html><style>html,body{{margin:0;background:transparent}}svg{{display:block;width:{w}px;height:{h}px}}</style>{svg}')
        args = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--user-data-dir={tmp}/prof',
                f'--window-size={w},{h}', f'--screenshot={out}', f'file://{page}']
        if transparent:
            args.insert(4, '--default-background-color=00000000')
        subprocess.run(args, check=True, capture_output=True, timeout=60)


render(mark(INK, ACCENT), 512, 512, HERE / 'mark-512.png')
big = Image.open(HERE / 'mark-512.png').convert('RGBA')
big.save(HERE / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
# Apple touch icon: the reversed mark on a solid dark ground with a little extra margin, no gradient.
touch = mark('#fff', ACCENT_DARK).replace('viewBox="0 0 48 48"', 'viewBox="-6 -6 60 60"').replace(
    'aria-label="SalesHub Cloud">', f'aria-label="SalesHub Cloud"><rect x="-6" y="-6" width="60" height="60" fill="{DARK}"/>')
render(touch, 180, 180, HERE / 'apple-touch-icon.png', transparent=False)
ratio = (Y1 - Y0 + 16) / (X1 - X0 + 16)
render(wordmark(INK, ACCENT), 1200, round(1200 * ratio), HERE / 'logo@2x.png')
print('built', HERE)


# ── Install into the static site ────────────────────────────────────────────
if '--install' in sys.argv:
    for name in ('favicon.ico', 'icon.svg', 'apple-touch-icon.png'):
        (SITE / name).write_bytes((HERE / name).read_bytes())
    inline = (HERE / 'logo-inline.svg').read_text().strip()
    mark_inline = mark('currentColor', 'var(--accent, currentColor)').replace('width="48" height="48"', 'width="26" height="26"')
    icons = ('<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/svg+xml" href="/icon.svg">'
             '<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
    # 20px tall ≈ the old 32px circles + 16px name in width (~200px); cap height 16px.
    css = ('<style id="sh-logo-css">.sh-logo{display:block;height:20px;width:auto;flex-shrink:0;color:var(--c-text,#2F2B3D);'
           '--accent:#099C99}[data-theme="dark"] .sh-logo{--accent:#0BAEAB}footer .sh-logo{height:22px}'
           '.footer-brand>.sh-logo{color:inherit;--accent:#0BAEAB}'
           '@media (max-width:600px){.sh-logo{height:18px}}</style>')
    old_mark = r'<svg[^>]*viewBox="0 0 44 44"[^>]*>(?:<circle[^>]*/>){4}</svg>'
    patterns = [
        old_mark + r'\s*(?:<span class="[a-z-]*logo-text">)?SalesHub Cloud(?:</span>)?',   # circles + name
        r'<div class="nav-logo-mark">S</div>SalesHub Cloud',
        r'<div class="logo-icon">S</div>\s*<span class="logo-text">SalesHub Cloud</span>',
        r'<span class="logo-mark">S</span>SalesHub Cloud',
    ]
    for page in sorted(SITE.glob('*.html')):
        html = page.read_text()
        before = html
        for p in patterns:
            html = re.sub(p, lambda _: inline, html)
        # The product mock-up's sidebar mark on the homepage becomes the new mark.
        html = re.sub(r'<div class="demo-logo-mark"[^>]*>(?:S|<svg.*?</svg>)</div>', lambda _:
                      f'<div class="demo-logo-mark" style="background:none;color:var(--c-text);--accent:#099C99">{mark_inline}</div>', html)
        # Favicons: replace the old data-URI circles / bare favicon.ico, or add them if the page has none.
        html = re.sub(r'<link rel="icon"[^>]*>(?:<link rel="(?:icon|apple-touch-icon)"[^>]*>)*', lambda _: icons, html, count=1)
        if 'rel="icon"' not in html:
            html = html.replace('</head>', icons + '\n</head>', 1)
        if 'sh-logo-css' in html:
            html = re.sub(r'<style id="sh-logo-css">.*?</style>', lambda _: css, html, count=1)
        elif 'sh-logo' in html:
            html = html.replace('</head>', css + '\n</head>', 1)
        leftover = re.findall(old_mark, html)
        if html != before:
            page.write_text(html)
        print(f'{page.name}: {"updated" if html != before else "unchanged"}{f" ({len(leftover)} old marks left)" if leftover else ""}')
