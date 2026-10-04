# claudemod

Claude Code mods.

- `context-bar/` — stacked context-window bar on the bottom row (the hint line under the prompt), one color per
  `/context` category, toggled with `/context-bar`, themed to the host OS
  (Fedora blue on Fedora). Load with `claude --plugin-dir ./context-bar`.

## Mobile mode (iOS / Termius)

`/context-bar mobile` switches to a compact one-row layout for phone-width
terminals (short label, stacked bar, percent). By default the
bar is in `auto` and goes mobile at 56 columns or fewer, so Termius portrait
needs no setup. `/context-bar desktop` forces the full layout, `/context-bar auto`
restores width detection, and bare `/context-bar` toggles the bar on and off.

- `prompts/nobara-bar.md` — build spec for the Nobara port (also lives on dominus-nobara at `~/git/claudemod/PROMPT.md`).
