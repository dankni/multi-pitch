# Training apps style guide

The apps in [website/training/](website/training/) share a look, and this is it written
down. The live version — every component on one screen, in both themes — is
[website/training/style-guide/](website/training/style-guide/index.html); run `npm start`
and open <http://localhost:9000/training/style-guide/>. That page is the reference for
*what things look like*; this file is the reference for *why*, and for the decisions a
screenshot can't show.

The page is gitignored, so it lives on the machine it is used on and never reaches the
bucket: it is for whoever is building an app, not for climbers. (It also carries `noindex`
and is absent from `generateSiteMap.js`, from when it was going to ship.) A fresh clone
will not have it — this file is the part that is committed.

## What the apps are

Self-contained browser apps you use on a wall, mid-session, holding a phone in one hand.
That drives nearly every rule below:

- **Big.** Everything is read at arm's length, often at an angle. When in doubt, larger.
- **Few decisions on screen.** One primary action, one heading, one number.
- **Offline and on-device.** No account, no network call, no upload — and they mean it: a
  service worker precaches the suite, so an app opens on a phone with no signal at all. Say
  so in the about panel of every app.
- **No build step, no dependencies.** Classic `<script>` tags, not ES modules — the apps
  share globals from [common/functions.js](website/training/common/functions.js). Three
  files per app: `index.html`, `main.js`, `style.css`.

Structurally they are *not* part of the main site (see [CLAUDE.md](CLAUDE.md)); they share
nothing with it but the domain.

## The shared layer

| File | What it gives you |
|---|---|
| `common/style.css` | Nav, buttons, panels, toggles, radios, stars, dark mode, countdown colours, the icon classes |
| `common/fontello.css` + `common/font/` | The icon font itself |
| `common/functions.js` | `requestWakeLock()`, `fullscreen()`, `speak()`, `countdown()`, `background()`, `toggleDarkMode()`, `toggleSound()`, `confirmReset()`, `openInfoBox()`/`hideAbout()`, the analytics tag — and the session furniture: `today()`, `getLog(key)`, `setLog(key, log)`, `saveCurrent(key, session)`, `setStar()`, `drawSavePanel()`, `drawSessionLog(view)`, `confirmToast()`, `removeLog()` |
| `common/gilford-routes.js` | The Gilford wall's routes and grade ladder — only the two apps that need it load it |

Link them in this order, then your own `style.css` last so it wins:

```html
<link href="/training/common/fontello.css" rel="stylesheet" />
<link href="/training/common/style.css" rel="stylesheet" />
<link href="/training/timer/style.css" rel="stylesheet" />
<script src="/training/common/functions.js"></script>
<script src="/training/timer/main.js"></script>
```

Every href and src is root-relative, from `/training/`. A relative one only resolves when the
page is opened *with* its trailing slash, so `/training/timer` - which the host serves
without redirecting - would load with no CSS at all.

Nearly everything is shared now — tick tiles, counter boxes, the log, fields. What an app
still writes for itself is its own geometry and layout: how big its tiles are, where its
clock sits. Components are marked **shared** or **copy** on the live page; before adding a
rule, check the page for one that already exists.

## Colour

One blue carries every interactive element. Red means *this destroys something*. The
countdown colours own the whole background and mean "get ready", never "error".

Every colour that carries text clears WCAG AA (4.5:1), and every fill clears 3:1 against the
page behind it — those two rules decided the values, not taste:

| Token | Use | White text on it |
|---|---|---|
| `#0b6ad6` | Primary — buttons, checked radios and toggles, a ticked plain tile | 5.2 |
| `#0053ba` | Pressed/hover, and link text on white | 7.1 |
| `#e8f0fe` + `#0053ba` ink | Quiet action — the lesser of two buttons. A tint, not a fill, with a `#1a73e8` border to give it an edge, and `#16294a` + white ink in dark mode | 6.2 light, 14.5 dark |
| `#6b6b73` | Off — unchecked radio labels, the toggle track, an unearned star | 5.3 |
| `#17812a` | Confirmation flash | 5.0 |
| `#1a73e8` | Focus ring — the one blue that clears 3:1 on a light tile and a dark one | — |
| `#a13333` | Destructive: border and label of `.secondary`, on `rgba(255,255,255,.85)` (hover `#fdeeee`) | 6.9 light, 5.0 dark |
| `#9bbde8` | Disabled. Fails AA on purpose: disabled controls are exempt, and it has to read as unavailable | 1.9 |

And the surfaces they sit on:

| Token | Use |
|---|---|
| `#121212` | Nav bar |
| `#F9F9F9` | Panel and tile |
| `#cfcfcf` | Counter box |
| `rgba(0,0,0,0.98)` | The about panel, over everything |

Dark mode is CSS: every colour that changes is a variable at the top of `common/style.css`
set with `light-dark(light, dark)`, so the page follows the phone's setting with no script.
The dark mode switch overrides it with `.light` or `.dark` on `<html>`, saved under
`trainingTheme` so every app follows it, including ones open in other tabs. Switching to what
the phone already shows forgets the override, so the phone's setting stays the default.
`functions.js` applies it from the `<head>`, before the body draws. A new
colour that changes with the theme goes in as a variable or a `light-dark()`, never as a
`.dark` rule. Page `#111`, panel `#262626`, counter box `#363636`, tile `#2a2a2a`
(`#383838` hovered), links `#8ec5ff`.

`.red` / `.orange` / `.yellow` / `.green` set the whole background for the countdown and
for "working" states, each with a dark-mode variant. Set them through `background("red")`,
which leaves the body's other classes alone. Red, orange and yellow fade in 120ms because each one lands
on a spoken word; anything slower and the screen is still mid-transition when the next word
starts.

The nine **hold colours** (`--hold`, and `--ink` for text on top of it) are the actual
colours of the holds on the Gilford wall. They are shared by the tick list and the
endurance app, and they are data, not decoration — don't repurpose them.

## Type

`'Hind', sans-serif`, centred. The scale is short on purpose: a title, a heading, a number,
body, a hint.

- `nav h1` 22px, 18px below 380px — the app's name, once.
- `h2` — section headings and the stage you are in. Capitalised by the shared sheet.
- `h3` — *the number*. 60px shared, and apps override it: 28px in a counter box, 44px for
  the Gilford tick count, 60px for a rest clock (48px below 380px).
- Body 16px; hint lines 14–15px at `opacity: .8`.

Any number that changes on a tick gets tabular figures, or the digits jitter and the clock
appears to dance:

```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum";
```

Button labels are uppercase and short: START SESSION, LAP, DISCARD, FINISH SESSION,
SAVE SESSION, ANOTHER SET. The one that begins a session is **START SESSION** in every app,
on a button with `id="primaryButton"` and the play glyph — it is the first thing anyone
looks for, so it reads the same wherever they are. Apps that pause reuse that button (PAUSE,
then RESUME) and put START SESSION back when the session is cleared. Spoken lines are two or three words, present tense, no punctuation to trip the
engine: `speak("Rest")`, `speak("Set 2")`.

## Components

**Nav bar.** Info and cog on the left, app name centre, fullscreen and (only if the app
speaks) sound on the right. Nothing else, and no back link — the way out is *Apps* in the
bottom nav. The fullscreen icon is hidden until `functions.js`
confirms support. The i and the cog are a thumb's width each with a gap between, and the cog
turns twice as the page loads to show where the settings are.

**Primary button.** Plain `<button>`, `id="primaryButton"`; leads with an icon when it
starts or repeats something. One per screen. Use `disabled` when the action exists but isn't available yet
(LAP before the clock runs); hide it when it doesn't belong on the screen at all.

**Secondary button** (`.secondary`) is the destructive one: an `#a13333` outline and label on `rgba(255,255,255,.85)` — never a red fill, so it never looks like the thing you are meant to press. The fill is left slightly transparent so it sits on the page instead of punching a white hole in it; in dark mode that blends to `#dbdbdb`, where the label still reads at 5:1. The hover, `#fdeeee`, is opaque on purpose: at 85% the dark page bleeds through and drags a pale pink under AA. It
ships `display: none` because it only appears once there is a session worth protecting. It
is **always** two taps — `confirmReset(buttonId, worthKeeping, onConfirm)` swaps the label
to SURE? and disarms itself after four seconds. Call `disarmReset()` if you hide the button
again.

**Quiet action** (`.quiet`) — the lesser of two real choices (ANOTHER SET beside FINISH
SESSION, the minus beside a grade in the bouldering app): a
pale `#e8f0fe` tint with `#0053ba` ink, so the solid primary beside it is plainly the
louder one. It needs three things the primary does not: a `1px #1a73e8` border, because
`#e8f0fe` is 1.15:1 against a white page and would otherwise have no edge; its own hover
(`#d2e3fc`), since the shared `button:hover` would fill it solid; and its own focus ring,
since the shared one is white and invisible on a tint. In dark mode it inverts — `#16294a` with a white label — because the light tint reads at
16:1 on a `#111` page and would shout louder than the primary. The label is white rather
than the pale blue that mirrors the light version: 14.5:1 against 8:1, and what makes the
button quiet is its fill sitting close to the page, not a dimmed label.

**Link action** is an `<a>` for a deliberate, quiet escape (*Skip the rest →*): underlined,
bold, solid blue, shrink-wrapped and centred so the full width isn't a hit area.

**Toast** (`toast("…")`, `.toast`) is for the one case the confirmation flash cannot
cover: a tap that did nothing, and why — HARDER in the bouldering app, once the ladder has
run out at V17. A ☺ (U+263A, not a glyph added to the font for one use), the message, and a
cross; along the bottom, gone in five seconds on its own.

The card is `#262626` with `#E8E8E8` on it — the same grey the note pop-up wears, since
both are things sitting on top of an app rather than part of one. A single grey cannot be
lighter than a white page *and* darker than a `#111` one, so it has an edge instead: the
3px `#17812a` rule along the top — the confirmation green, because a toast is the app
answering you — and a hairline of white at 18%, which does nothing over a light page and
lifts the card off a dark one. The face takes `#2ecc40`, the palette's other green: `#17812a`
reads 3:1 on that card, which carries a 3px rule but leaves a face muddy.

A warning (`toast(…, null, true, true)`, `.toast.warn`) — the browser can't do what the app
needs — swaps both greens for `--warn` (`#eda100`) and the face for a ⚠ (U+26A0 + U+FE0E, so
it stays a glyph rather than an emoji). Pass a `<template>` instead of text when it wants a
link, as gaps does to caniuse. loft's pinned footer wears the same orange.

It runs nearly the full width of a phone — 10px of page either side — and stops at the
house column on anything wider, with a 70px minimum height so a one-line message still
reads as a card rather than a strip. It sits at 98% opacity: just enough of the app shows
through to say the toast is over it rather than part of it. That costs the label almost
nothing — from 12:1 on the solid card to 11.7:1 over a white page and 11.9:1 over a dark
one, with the face and the cross still above 6.8:1 either way.

`pointer-events` are off until it is up, so a toast on its way out cannot swallow a tap
meant for the app underneath, and `role="status"` has it announced without taking focus. Each
toast is its own card, stacked above any still up and going in its own time, so two things
said on one tap are both seen; the same message again restarts its clock rather than
stacking a copy. It says something and asks
nothing back — anything that needs a decision is a panel or a two-tap confirm, and anything
the app *did* do is the flash, not a sentence about it.

**Panel.** A bare `<section>` — full width, 5px radius, `#F9F9F9`. Cap it at 520px and
centre it.

**Counter boxes** (`.box`) — two to four, 45% wide with 2% margins, label above, number
below.

**Tick tile** (`.route`) — the one thing you tap to say you did something. The only
left-aligned text in the apps: hold colour down the left edge, a 13px detail line, the grade
at 22px, and a tick that appears only once ticked. `.plain` is the same tile with no hold to
show. Ticked state is a class *and* `aria-pressed` — and the tick glyph, so it never rests
on colour alone.

**Chips** (`.nice-radios`) — the real control is hidden and its label is the button;
uppercase, 65px minimum. Radios for one-of-several (a grade, a difficulty, a rest length),
**checkboxes for a set** — the loft app's hold colours are the same chip, ten of them
wrapping across the panel rather than ten switches stacked down it. A checkbox chip carries a **tick when it is in the set and a cross when it is not** — drawn
from the icon font by `:before`, so nothing is redrawn on a toggle. A radio chip needs none
of that (one is filled, the rest are not, and that is the whole choice); a checkbox has no
such pair to compare against, and a dark colour chip least of all — filled black reads much
like switched-off grey.

A chip that stands for a colour wears it: add `.colour-chip` and set `--chip` to the colour
and `--chip-ink` to black or white, whichever can be read on it. Filled with the colour when
on, and the plain grey chip when off — the tick and cross carry that difference, so the off
state needs no rim of its own. No swatch icon beside the word, since the chip is the swatch. Work the ink out rather than guessing it: the loft app's
`inkFor()` reads a hex directly and hands a name to the browser to resolve. Always follow a picker with a hint line spelling out what the
choice produces. A picker's track follows the theme: `#e8e8ec` with a `#94949b` edge and
`#2b2b30` labels in light (blue on it at 4.2:1, the edge 3:1 on white), `#1a1a1d` with a
`#636369` edge and white labels in dark. Inside an overlay it is always the dark one. Inside the settings panel, wrap a group in
`<fieldset class="setting-group">` with a `<legend>` so it is announced as one choice.

**Toggle** (`.switch-label` + `input[type=checkbox]`) — iOS-style switch, for one setting
that is on or off (dark mode, trad mode). A set of things is chips, not a column of
switches. Lives under the cog, and its label always ends in its own state word: *Dark
Mode On*.

**Fields** — `.field` is the date in the tick list and the colour box in the loft app,
which used to be two different shapes. 36px tall, `font: inherit` at 15px, the tiles' focus
ring, and the pickers' dark track in both themes — `#1a1a1d` fill, 1px `#636369` edge, 12px radius,
white ink — with `color-scheme: dark` so a date or time picker's icon reads on it. A field carries no margins; spacing comes from the row it sits in — `.field-row` for fields
that are merely near each other, **`.field-group`** for fields that are one control: joined
edges under a single border, as in the loft app's *colour name + swatch + ADD*. The group
takes the focus ring, so a ring is never drawn inside it on top of its neighbours.

**Recent logs** — `<details class="recent-logs" id="recentDetails">` with *Show recent logs* as its
summary and an empty `<ol id="recentLogs">`: the session's last three taps and how long ago, for
checking a tap landed. The app calls `noteRecent(text)` before `keepSession()` and `drawRecent()`
when it draws; the rest is `functions.js`. Hidden while idle. In the gym session, Outside and the
lap timer.

**Finishing a session** — FINISH SESSION reveals `.ending` (which ships hidden): *Good
Session?*, five stars, SAVE SESSION. Scroll it into view; on a phone it lands below the
fold. Stars are optional.

Under the stars is a note: 300 characters with a live count, saved with the session as
`comment` and shown back in the log — a row with a note carries a speech bubble, and tapping it
opens a card with that session's stars and words. It closes on a tap anywhere else, on
Escape, or on the same icon again. `resetSavePanel()` clears the stars and the note
together, which is what an app calls where it used to call `setStar(0)`; an app that reopens
a saved session to edit it (the tick list) hands the note back with `setSessionComment()`,
or saving again would write over it with an empty one.

The panel is built by `drawSavePanel()` on load, so an app writes one line —
`<div id="endingDiv" class="ending"></div>` — and gets the title, the stars with their
click and keyboard handlers, and a SAVE SESSION button wired to its own `saveSession()`.
It can still relabel that button afterwards, as the tick list does when it reopens a saved
session. Five copies of that markup is five places for it to drift, which is how the
endurance app ended up with white stars in its log: `#about .demo-icon { color: #FFFFFF }`
out-specifies `.icon-star.active`, so a saved rating looked like no rating at all.

**Activity log** — in the about panel, newest first, with a stats line above it. Deleting
an entry asks first, in a warning toast edged in red: only DELETE deletes.

**Activity log** — one table, drawn for every app by `drawSessionLog()` in
`common/functions.js`: date, session, rating, delete, newest first, with a stats line above
it. A log *is* tabular — every row the same fields — so the markup says so: real `<th>`s for
a screen reader, a date column that lines up so two sessions can be compared down the page,
and the bin in a cell of its own instead of trailing the end of a sentence.

Four columns is the limit (the panel is about 300px wide on a phone), the varying detail
goes *inside* the session cell as a second line rather than becoming more columns, and
nothing scrolls sideways — the detail wraps and the rating column drops below 380px. The
bin asks in a red-edged toast, `confirmToast(message, deed, onConfirm)`, before anything is
deleted - DELETE does it, Cancel or the cross keep it. The UKC logbook's Remove and a Tabata
routine's bin ask the same way.

An app supplies what to call its own sessions and nothing else:

```js
const logView = {
    "key" : logKey,
    "describe" : entry => ({ "title" : "4 laps", "detail" : "0:00:40 on the clock" }),
    "stats" : log => `${log.length} sessions · …`,
    "onEdit" : "editSession"    // optional — draws a wrench, as the tick list does
};

drawSessionLog(logView);        // drawSessionLog() on its own redraws
```

An entry needs an `id`, a `date` and a `rating`, and carries a `comment` when one was
typed; the rest is whatever that app counts.
Store the date as `yyyy-mm-dd` — it sorts, it filters by month for the stats line, and it is
what a date input speaks. The log reads it back as `13 Sep` with `2026` on the line beneath:
the part that changes every session on top, the part that changes once a year under it.
Anything read rather than seen — a delete label, say — gets the whole thing on one line from
`logDate()`.

**Overlays** — two per app, both `<aside class="overlay">`, both full-screen black sheets
over the session, and only one up at a time. `openOverlay(id)` and `closeOverlay(id)` in
`functions.js` run them (`openInfoBox()`, `hideAbout()`, `openSettings()`,
`hideSettings()` are the names the markup uses).

**Info**, behind the i (`id="about"`) — what the app is, and what you have done with it:

1. *About this application* — what it is, in two or three short paragraphs, ending with
   what it does with your data.
2. Links — whatever this app links out to (*Github Page*, a plan, a PDF), with
   `icon-link-ext` after anything that leaves the site. The app list is not one of them - it
   is *Apps* in the bottom nav. On an overlay the quiet action always wears
   its dark treatment (`.overlay .quiet`), because the panel is black in both themes. They
   go in a `<p class="panel-links">`, which puts one to a line with 18px around each: they
   are hit with a thumb rather than aimed at, and a `<br />` leaves nothing to aim at. No
   `<br />` inside it — the margin does the spacing.
3. *Activity Log* — stats line, then the table of sessions.

**Settings**, behind the cog (`id="settings"`) — every knob the app has and nothing else:
max grade, session type, difficulty, rest lengths, which wall, colours, then the two every
app shares at the bottom: dark mode and Prevent Screen Sleep.

Anything under the cog **must stick between visits**. A setting you cannot see is one you
would otherwise set again every session, so each is written to its own `localStorage` key
on change and read back on load (`enduranceGrade`, `enduranceStyle`, `enduranceWall`,
`enduranceRest`). A session already running keeps what it started with; a change tells on
the next one. Where a choice changes what the next session will be, echo it in a line of
`.style-hint` text — the endurance app writes the same sentence onto the set up screen and
into the settings panel, so the effect of a change is visible while you make it.

Both are laid out by the same rule as the session behind them: everything they hold sits in
the one centred column, 90% wide and capped at `--column` (520px). Before that each part set its own
width — 450px for a paragraph, 90% for the log, 80% for a setting group — which barely
showed on a phone and stepped in and out down the page on a desktop. Add something to a
panel and it lines up with everything else without being told to.

Groups of related settings go in `<fieldset class="setting-group">` with a `<legend>`
(shared, in `common/style.css`), so a row of radios is announced as the one choice it is.
No accordions: a settings panel is short enough to read, and a fold is one more tap between
a climber and a knob.

They were one panel until the settings of the busier apps buried the log at the bottom of
it. Splitting them made the set up quieter as well as tidier, so an app says where it went:
`showCogHint()` puts a small card under the cog on load — `.hint-pop`, a line of text, gone
in eight seconds or on a tap. It is shown until the settings panel has been opened once,
which is the moment it has done its job, and the flag (`seenSettings`) is shared by the
suite because it is the same lesson in every app. An app with no settings panel never shows
it. Splitting them means the thing you open mid-session — *what have I done today* — is the
first thing under the i, and the thing you set once is behind its own icon. Everything in
either is white at full strength; nothing dimmed with opacity, except stars, which are grey
until earned and gold after.

## Icons

One font (Fontello). Every icon is `<i class="demo-icon icon-NAME"></i>`; the full set with
its meanings is on the live page. No SVG inside an app — the landing page is the only place
with drawn icons. Adding a glyph means rebuilding the font in Fontello and updating every
app, so use what is there.

Seventeen glyphs have a fixed job — `icon-play` START, `icon-ok` tick/confirm/LAP,
`icon-ccw` reset or go round again, `icon-cancel` discard, `icon-trash` delete a log entry,
`icon-star` rating, `icon-info` about, `icon-resize-full`/`-normal` fullscreen,
`icon-volume-high`/`-off` sound, `icon-moon` dark mode, `icon-wrench` edit a saved session,
`icon-link` internal and `icon-link-ext` external links, `icon-github` the repo. The live
page lists them in full with what each one means, and the nine the font carries that nothing
uses (`sun`, `cog`, `mic`, `menu`, `star-empty`, `mail`, `mail-alt`, `bug`, `share`) —
reach for one of those before adding a glyph. The note bubble is the one icon that is not
from the font: the font has no bubble, and `.icon-note` draws one as a mask filled with
`currentColor`, which behaves like a glyph everywhere it is used. A glyph means one thing everywhere; don't
borrow one for a second job.

## Layout and motion

- **One centred column, everywhere.** `width: 90%; max-width: var(--column)` — 520px — set
  once in `common/style.css` for every wrapper the apps have: `.holder`, `.ending`,
  `#setup`, `#data`, `#actions` and each direct child of an overlay. 90% rather than 100%
  so a phone always keeps a gutter: 324px of content on a 360px screen, 360px on a 400px one,
  and 520px however wide the window gets after that. Nothing in an app sets a width of its
  own; if a new wrapper needs one, add it to that rule rather than writing another 520.
  That includes the activity log: its table sits in the column like everything else.
- One breakpoint, **380px**: shrink the clock, tiles and nav; never rearrange them.
- Radii: 4px buttons and inputs, 5px panels, 8px tiles, 20px toggles.
- Motion is feedback, not decoration: `scale(0.99)` on press, 150–300ms on hover and
  shadow, 0.5s on a background change. Nothing slides or bounces.
- `requestWakeLock()` when a session starts and `releaseWakeLock()` when it ends — not
  when a timer reaches some number. Both are in `common/functions.js`, which also re-asks
  for the lock on `visibilitychange`: a browser drops the lock whenever the page is hidden
  and never hands it back, so without that a single tab switch leaves the screen sleeping
  for the rest of the session. Nothing is tied to fullscreen.
- **Prevent Screen Sleep** is a switch under the cog in every app, beneath dark mode, on by
  default (which is what the apps did before it was a choice). It gates the lock rather than
  the session: `requestWakeLock()` still records that the session wants the screen awake, so
  turning the switch back on mid-session takes a lock immediately, and turning it off drops
  the one being held without ending anything. One key, `preventSleep`, shared by the suite.

## Non-negotiables

- Anything tappable is a `<button>` or an `<a>`. One that is only an icon takes
  `.icon-button`, which removes the button look, and an `aria-label`.
- No inline script: a control names the function it calls with `data-action` (a click),
  `data-change` or `data-input`, and `functions.js` calls it with the element.
- What is on screen follows `body[data-state]` in CSS; script sets the state, not
  `style.display`. Anything simply on or off uses the `hidden` attribute.
- State shown in colour is also shown in a glyph or a word.
- `aria-pressed` on anything with an on and an off; `aria-hidden="true"` on decorative
  icons.
- Focus stays visible — the shared button outline and the tile's 2px blue ring.
- Destructive actions take two taps, and the second tap is never the same pixel as an
  ordinary action.
- Real headings in order, one `h1`, in the nav.
- Keyboard shortcuts are a bonus, never the only route — document them in the about panel,
  as the lap timer does with space and escape.

## State and storage

Each app owns its `localStorage` keys, prefixed with its name (`enduranceLog`,
`enduranceCurrent`, `enduranceWall`, `enduranceRest`), and passes the key to the shared
`getLog(key)`, `setLog(key, log)` and `saveCurrent(key, session)`. Two kinds:

- **The log** — saved sessions, an array of small records with `id`, `date`, a rating and
  whatever the app counts.
- **The session in progress** — written on every change so a reload mid-session picks up
  where it left off, including a running rest timer. Store *the moment a timer ends*, not
  the seconds left, or a backgrounded phone loses time.

Settings that describe how you train — which wall, how long you rest, what your max grade
is, which session type — persist and belong under the cog; a session already running keeps
the settings it started with, so a change only tells on the next one.

## Starting a new app

1. Copy the smallest app that resembles it — the lap timer is the shortest — and keep the
   shape: `index.html`, `main.js`, `style.css`, `manifest.json`.
2. Build the screen from the components above before writing any CSS of your own.
3. Add a card to [website/training/index.html](website/training/index.html) and an entry to
   `trainingPages` in [generateSiteMap.js](generateSiteMap.js) — there is no JSON source for
   either, so both are by hand. Bump that date whenever you change an app.
4. Add the app to the `apps` list in that page's script, so its sessions join the combined
   log — the key it saves under, the name to show, and one line describing a session.
5. Add the app's four files to `SHELL` in [sw.js](website/training/sw.js) and bump
   `CACHE_VERSION`. An app that is not in the shell is the one app in the suite that does
   not work offline, and nothing will tell you.
6. Check it in dark mode, at 380px, and with the phone's screen lock in the way.

## The overview and progress pages

[website/training/index.html](website/training/index.html) is the list of apps, with how
much local storage the site is using under it. The progress page,
[website/training/progress/](website/training/progress/index.html), has the charts and,
under them, every app's sessions in one table, newest first
([progress/sessions.js](website/training/progress/sessions.js)). It is the one page that
reads all the apps' localStorage keys: they are all on the same origin, so it is a read of
their keys rather than anything the apps have to publish. It is read only — a session is edited or
deleted in the app that recorded it, which is the only place that knows what its fields
mean — and it says so under the table. The speech icon opens the same note card the apps
show, drawn by the page's own script because its rows are keyed by their place in the
table rather than by session id, since each app numbers its own.

The page carries a second, much shorter description of each app's sessions than the app's
own `logView` does. That is deliberate: the app's log says the whole of it, the progress
page only has to say which night was which. It is defensive about what it reads (a missing field
counts as nothing, a key that will not parse is skipped, the rock rings app's old `score` is
read as a rating), because it reads six keys written by six apps over a couple of years and
one bad row should not take the page with it.

With no sessions, or with JavaScript off, the sessions section stays `hidden`. (The shared `section` rule is an inline-block panel, which
outranks the `hidden` attribute, so [common/page.css](website/training/common/page.css) -
shared by the overview and the progress page - carries a `section[hidden]` rule.)

Above the table, [progress/charts.js](website/training/progress/charts.js) draws the charts from the same logs as
plain SVG, with no library - sport climbs, boulders and trad climbs by grade. Until
something graded has been logged the page says so instead. A switch sets the range to all
time, the last year (the default), 30 days or 7 days, and it is remembered as
`overviewRange`. In the year, 30- and 7-day views, the period
before is a thin line across each bar at the height it reached. It is a quiet comparison,
not a second bar.
- **Sport grades** come from tick-list route ids looked up in `gilford-routes.js`, plus the
  `grades` list that endurance sessions have saved since September 2026. Earlier endurance
  sessions stored only a count, so they are not in this chart.
- **Axes:** the sport axis always runs 5 to 7b and the boulder axis V0 to V8. A grade
  outside those ranges appears once someone has climbed it.
- **Colours:** the grade colours mark difficulty bands: easy is green (to 5+ /
  V2), medium amber (6a–6b+ / V3–V4), hard red (6c–7a+ / V5–V7) and very hard purple (7b+ /
  V8+). They get no legend, because the grade is written under every column.
- **Width:** the charts are drawn at the width they are shown at rather than scaled, so the
  11px labels stay 11px on a phone. A ResizeObserver on the chart redraws it whenever that
  width changes.

On a screen 1024px or wider, progress and sessions sit side by side, top aligned. The two
columns match the two columns of app cards above them, and both use `--wide`. With no
progress to show, the sessions table goes back to the middle at text-column width. The app
cards are all the height of the tallest one, and their icons fade in one after another (not
with reduced motion).

## What moved into common/, and what did not

The apps used to carry copies of each other: **29 byte-identical CSS rules** in more than
one app stylesheet, and four apps each drawing the same session list their own slightly
different way. That has been consolidated — this is the record of it, and of what was
deliberately left alone.

### Moved into `common/functions.js`

| What | Was in | Now |
|---|---|---|
| `today()`, `getLog()`, `setLog()`, `saveCurrent()` | endurance, gilford, timer — identical | Shared, each taking the app's own key |
| `setStar()`, `onRatingChange()` | four apps, and five | Shared. It writes the rating into `session` when there is one; anything else reads `sessionRating` |
| The session in progress: `session`, `keepSession()`, `restoreSession()`, `saveToLog()` | five apps | Shared, under the app's `app.currentKey` and `app.logKey` |
| `plural()`, the h:mm:ss clock, escaping, the note card | up to five files each | `plural()`, `formatClock()`, `escapeHtml()`, `showNote()` |
| The loft and rings clocks | loft, rings | `secondsClock()` |
| Start, pause, reset and save for a workout run to a clock | rings, nohangs | `common/workout.js` and `common/workout.css` |
| `showSessionLog()`, `toggleConfirm()`, `removeLog()` — about 40 lines each | four apps | `drawSessionLog(view)`, `toggleConfirm()`, `removeLog()`. An app passes a `logView` and keeps nothing. The loft app, which had no log at all, got one for the cost of that `logView` |

The rock rings app was the odd one out: its log had no ids, deleted entries by their place
in the array and called the rating `score`. `migrateLog()` in that app brings anything the
old version wrote up to the shared shape once, on load — dates and difficulties are kept,
nothing is thrown away, and running it twice changes nothing.

### Moved into `common/log.js`, `common/ladder.js` and `common/log.css`

The tick list, the gym session and trad log what was climbed the same way: start, tap,
finish, rate, save, and reopen from the log. `log.js` is that flow once; an app describes
its session in a global `app`. The gym session and trad share `ladder.js` for the grade
ladder - trad is the gym session with one ladder - and `log.css` for the session bar, the
ladder tiles and what each session state shows.

### Moved into `common/style.css`

| What | Was in |
|---|---|
| Tick tiles and the nine hold colours | endurance, gilford — apps keep only their own geometry |
| `#log`, `#log p`, `#stats`, the new `.log-table` | endurance, gilford, timer |
| `.ending`, `.save-title` | endurance, gilford, timer |
| `.box` counters, the `h3` inside them, `.dark .box` | loft, timer |
| Tabular figures on a clock — now `.tabular` | endurance, timer, by id |
| `.field` and `.field-row` | replaced two different input shapes in gilford and loft |
| `.quiet`, the pale tint button | endurance, by id — the bouldering app wanted the same button, so it stopped being one app’s |
| `.toast` and `toast()` | new with the bouldering app, in `common/` from the start — the next app that needs to say something wants the same one |

Two shared rules were fixed rather than worked around. `section, aside div` handed a light
panel to every div inside an about panel, which four apps each carried a rule to undo; it
is `section` now and the four overrides are gone. `.dark section` was `#BFBDBD`, a light
grey panel in dark mode that every app replaced; it is the `--panel` variable now.

### Left alone, on purpose

- **`saveSession()`** in the apps outside `log.js`, because what a session *is* differs per app.
- **`.icon-ok { margin-right: 40px }`** in the shared sheet. It was the log's spacing and
  now lands on every tick icon on the page, including the one inside a FINISH SESSION
  button — changing it moves a label in three apps, so the log table scopes it away instead.

## Installing to a phone, and working offline

Each app installs to a homescreen as its own icon, and opens with no signal. Four pieces:

**A manifest per app** — `<app>/manifest.json`, linked from its head. Its own `name`,
`short_name`, `start_url` and `scope` (both `/training/<app>/`), `display: standalone` so
it opens without browser chrome, `theme_color: #121212` (the nav) and
`background_color: #111111` (what flashes while it launches — black is the safer of the two
to guess at). Icons are the site's, at 192 and 512, plus a maskable 512 so Android doesn't
letterbox it.

**The head tags** — the manifest link, `theme-color`, and the Apple set
(`apple-mobile-web-app-capable`, `-status-bar-style`, `-title` and `apple-touch-icon`).
iOS supports very little of a manifest and never offers to install: it is Share → Add to
Home Screen by hand, and those tags are what make the result look like an app rather than a
bookmark.

**One service worker for all five**, at [`training/sw.js`](website/training/sw.js). It sits
at `/training/` so its scope covers every app and the landing page, which means the shared
stylesheet, the icon font and `functions.js` are cached once rather than six times. It
precaches about forty files on install, then serves them cache-first — a session on a wall
is the worst possible moment to wait on a network timeout. Anything that is not a plain
same-origin GET under `/training/` is left alone, so the analytics tag simply fails when
there is no signal instead of being cached or retried. `registerServiceWorker()` in
`functions.js` registers it, and every training page loads that file - the overview and
progress pages as well as the apps.

**A self-hosted typeface.** Hind now comes from `common/font/` via `@font-face` in the
shared stylesheet, not from Google Fonts. An app that is meant to work with no signal cannot
fetch its own typeface from somewhere else — offline, the whole suite used to fall back to
the system sans.

Two things to keep in mind when you change an app:

1. **Bump `CACHE_VERSION` in `sw.js`.** A cache-first worker will serve last month's app
   forever otherwise. The old cache is deleted on activate, and the deploy's CloudFront
   invalidation means the new worker is picked up on the next launch.
2. **Add new files to `SHELL`.** It is a hand-written list because there is no build step.
   `cache.addAll` is all-or-nothing, so a path that 404s means no app installs at all —
   worth a check that every entry exists before deploying.

The style guide page is deliberately *not* in the shell: it is a development reference, not
something to carry up a hill.

## Legacy in `common/style.css`

Don't build on these, and don't be surprised by them:

| Rule | What it really is |
|---|---|
| ~~`#log { max-width: 300px }`~~ | Gone. From when the log was a short list of lines; being an id it quietly beat the column rule and squeezed the session table into 300px |
| ~~`.ring`, `.task`, `#preview`, `#next`, `#color`, `.slim`, `.active`, `.shrink`~~ | Gone: the rings and loft rules moved into those apps, and the rest were unused |
| `button { font-family: sans-serif }` | Buttons miss out on 'Hind'. Left alone because changing it moves every label in every app |
| `.icon-ok { margin-right: 40px }` | Once the log's spacing, now landing on every tick icon including the one inside a FINISH SESSION button. Left alone for that reason; the log table scopes it away, so do the same where it bites |
