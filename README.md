# claudemod

Claude Code mods.

- `context-bar/` — stacked context-window bar above the prompt, one color per
  `/context` category, toggled with `/context-bar`, themed to the host OS
  (Fedora blue on Fedora). Load with `claude --plugin-dir ./context-bar`.

## Mobile mode (iOS / Termius)

`/context-bar mobile` switches to a compact 3-line layout for phone-width
terminals (percent, full-width stacked bar, top 3 categories). By default the
bar is in `auto` and goes mobile at 56 columns or fewer, so Termius portrait
needs no setup. `/context-bar desktop` forces the full layout, `/context-bar auto`
restores width detection, and bare `/context-bar` toggles the bar on and off.
