# Toasts in the training apps

Every toast the apps show, one row each, with ideas for new ones alongside. To add an idea,
add a row under **Ideas**; when it's built, move it up to **Live**.

All toasts drop from under the top nav (the very top in the Tindeq Arcade's full screen),
newest at the top. Sources are under `website/training/` — search the file for the message.

## Live

| App | Message | Kind | Stays up | When it shows | Source | Tested | Notes |
|---|---|---|---|---|---|---|---|
| All apps | There's a new version - tap to reload | Action | Until tapped or closed | A new version of the apps takes over while a page is open | common/functions.js | Yes | |
| Gym Session, Outside | You wish! Less clicking more climbing | Info | 5.2 s | Tapping harder past the top of the grade ladder | common/ladder.js | Yes | |
| Tick List | Half the routes on the wall ticked, nice one! | Info | 5.2 s | A tick takes the session to half the routes on the wall | gilford/main.js | Yes | |
| Tick List | Nice work ticking the 7's | Info | 5.2 s | The last of the 7s is ticked | gilford/main.js | Yes | |
| Tick List | Amazing! you ticked them all, that's the goal this app was made for | Info | 5.2 s | Every route on the wall is ticked | gilford/main.js | Yes | |
| Tindeq Arcade | New high score | Info | 5.2 s | During a run, the score first passes the best | gaps/main.js | Yes | |
| Tindeq Arcade | Copied, ready to paste | Info | 5.2 s | SHARE with no share sheet, and the copy worked | gaps/main.js | No | |
| Tindeq Arcade | Couldn't copy it | Warning | 5.2 s | SHARE with no share sheet, and the copy failed | gaps/main.js | No | |
| Tindeq Arcade | Zeroed | Info | 5.2 s | Zeroing the Progressor from the cog | gaps/main.js | No | |
| Tindeq Arcade | This browser can't connect to a Tindeq Progressor. Use Chrome or Edge on Android or a computer - or hold the screen to play. | Warning | Until closed | The page opens in a browser without Web Bluetooth | gaps/main.js | Yes | Text, with its link, is the `#noBluetoothToast` template in gaps/index.html |
| Tindeq Arcade | The Progressor's battery is low | Warning | Until closed | The Progressor reports low power | gaps/progressor.js | No | |
| Tindeq Arcade | The Progressor disconnected | Info | 5.2 s | The Progressor drops out without being disconnected in the app | gaps/progressor.js | Yes | |
| Progress | Backup restored: N sessions added | Info | 5.2 s | After a backup file is restored and the page reloads | progress/backup.js | Yes | |
| Progress | Nothing new in that backup - it's all here already | Info | 5.2 s | After restoring a backup that adds nothing | progress/backup.js | Yes | |
| Progress | Couldn't restore that file: &lt;error&gt; | Warning | 5.2 s | A backup file fails to restore | progress/backup.js | Yes | |
| Gym Session, Tick List, Outside | Wow, that's the highest grade we have seen you tick! Congrats. | Info | 5.2 s | A tick harder than any saved of its kind - boulder, sport or trad - and than the session's own earlier ticks | common/records.js | Yes | Sport counts the gym session, tick list and endurance together. Says nothing with nothing saved to beat. |
| Gym Session, Tick List, Outside | That's the highest grade we have seen you tick this month! Congrats. | Info | 5.2 s | As above, but only against the last 30 days, when it isn't the hardest ever | common/records.js | Yes | Rolling 30 days, not the calendar month |
| Gym Session, Lap Timer | Wow, that's your longest session ever. You're getting strong! | Info | 5.2 s | On FINISH, the climbs (gym) or laps (lap timer) are more than in any saved session | common/records.js | Yes | Not on a session reopened with the wrench, or a lap timer session typed in |
| Gym Session, Lap Timer | That's your longest session this month. You're getting strong! | Info | 5.2 s | As above, on FINISH, but only against the last 30 days, when it isn't the longest ever | common/records.js | Yes | Rolling 30 days, not the calendar month |

## Ideas

| App | Message | Kind | Stays up | When it shows | Notes |
|---|---|---|---|---|---|
| Endurance | Last set - make it count | Info | 5.2 s | The final set of a session starts | Example of how a new idea looks - edit or delete this row |

## Columns

- **App** — the app the toast appears in. *All apps* = from common code on every page.
- **Message** — the words on the toast, as written in the code.
- **Kind** — *Info*: green edge and a smiley. *Warning*: orange edge and a warning sign. *Action*: the message is a button.
- **Stays up** — *5.2 s*: goes on its own. *Until closed*: stays until the cross is tapped. *Until tapped or closed*: an Action.
- **Tested** — whether `cypress/e2e/training-apps.cy.js` checks it.

## In the code

`toast()` in `common/functions.js`. The same message again restarts its clock rather than
showing twice.

| Call | Gives |
|---|---|
| `toast(message)` | Info, gone after 5.2 s |
| `toast(message, onTap)` | Action — stays until tapped or closed |
| `toast(message, null, true)` | Info that stays until closed |
| `toast(message, null, true, true)` | Warning that stays until closed |
| `toast(message, null, false, true)` | Warning, gone after 5.2 s |

`message` is text, or a `<template>` element when the toast needs a link.
