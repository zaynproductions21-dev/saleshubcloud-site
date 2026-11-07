# Replit Agent prompt: put the new SalesHub Cloud logo into the app

Paste everything below the line into the SalesHub Cloud Repl's Agent.

---

Replace the SalesHub Cloud logo everywhere in this app with the new brand logo. Do not redraw, retype or recolour it. Download the finished files and use them exactly as supplied.

**1. Download these files** (permanent links, pinned to one commit) into the folder the client serves static files from (for a Vite app that is `client/public/`; check what this project uses):

```
BASE=https://raw.githubusercontent.com/zaynproductions21-dev/saleshubcloud-site/a9231691188daff6e357ced184a8dc9f0e98b6ca/brand/logo/final
mkdir -p client/public/brand
for f in logo.svg logo-reversed.svg logo-mono-black.svg logo-mono-white.svg logo-name-only.svg logo-inline.svg \
         mark.svg mark-mono.svg mark-reversed.svg icon.svg logo@2x.png mark-512.png apple-touch-icon.png favicon.ico; do
  curl -fsSL "$BASE/$f" -o "client/public/brand/$f"
done
cp client/public/brand/favicon.ico client/public/favicon.ico
cp client/public/brand/icon.svg client/public/icon.svg
cp client/public/brand/apple-touch-icon.png client/public/apple-touch-icon.png
```

**2. Make one `Logo` component** and use it everywhere the logo appears. Paste the contents of `logo-inline.svg` into it as inline JSX: rename `class` to `className`, and keep `role="img"` and `aria-label="SalesHub Cloud"`. Don't use it as an `<img>`. Its ink is `currentColor` and the teal half of the S uses `var(--accent)`, so inline it follows the theme. Props: `variant: "full" | "name-only"` (name-only = the paths from `logo-name-only.svg`, without "Cloud") and `height` (default 20). Set the colours with CSS:

```css
.sh-logo { height: 20px; width: auto; display: block; flex-shrink: 0; color: #2F2B3D; --accent: #099C99; }
.dark .sh-logo { color: #FFFFFF; --accent: #0BAEAB; }   /* match however this app marks dark mode */
```

Also make a `Mark` component from `mark-mono.svg` (the S on its own, square, `currentColor` + `var(--accent)` the same way). It is only for places that are square: a collapsed sidebar, the mobile header icon, avatars.

**3. Replace every old logo.** Search the whole codebase, server-rendered templates included, for the old logo: the concentric-circles SVG (`circle` elements filled `#0BAEAB` / `#5BC4C0` / `#E6F7F7`), any teal rounded square containing a letter "S", any `logo` image files, and the text "SalesHub Cloud" styled as a logo next to an icon. Swap them in:
- Sidebar (expanded): `<Logo variant="name-only" height={18} />`. Collapsed sidebar: `<Mark />` at 24px.
- Top bar / mobile header: `<Logo height={20} />`, or `<Mark />` where there is no room.
- Login, sign-up, password-reset and the client-facing pages (e-sign, intake forms, shared info links): `<Logo height={28} />`, centred above the card.
- Loading and splash screens: `<Mark />` at 48px.

**4. Favicons and app icons.** In `index.html` `<head>`, remove any existing icon links and add:

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#28243D">
```

If there is a `manifest.json` / `site.webmanifest`, point its icons at `/brand/mark-512.png` (512×512) and `/apple-touch-icon.png` (180×180).

**5. Emails and PDFs** (WhatsApp/email templates, e-sign documents, generated PDFs, advice slips, invoices). Email clients do not render SVG, so in HTML emails use the absolute URL of `/brand/logo@2x.png`, displayed at `width="220"` with `alt="SalesHub Cloud"`. In generated PDFs, embed `logo.svg` if the PDF library supports SVG; otherwise use `logo@2x.png` at 50 mm wide. On black-and-white or fax output, use `logo-mono-black.svg`.

**6. Rules. Don't break these:**
- Never put the `Mark` next to the `Logo`. The S would appear twice ("S SalesHub"). Use one or the other.
- Never set "SalesHub Cloud" in a live font beside the S, and never stretch, add a shadow, a gradient or a tile behind it, or recolour the halves.
- Only the lower half of the S is teal: `#099C99` on light backgrounds, `#0BAEAB` on dark ones. Ink is `#2F2B3D`; the dark ground is `#28243D`.
- The logo is never shorter than 16px (use `name-only` below 18px). Leave clear space around it equal to about a fifth of its height.
- Delete the old logo files and components once nothing references them.

**7. Check before finishing.** Run the app and screenshot the login page, the sidebar (expanded and collapsed), the mobile header at 375px wide, and one sent email and one generated PDF, in light and dark mode. Confirm that the browser tab shows the new S favicon and that no concentric circles remain anywhere (search the built output for `#5BC4C0`). Then list every file you changed.
