# Task: build "nobara-bar", a Claude Code mod for Nobara Linux

Build a Claude Code mod (plugin of function hooks, hot-reloaded) that draws my
context window as a stacked bar on the bottom row of the terminal UI, one color
per /context category, themed for Nobara Linux. It has a desktop layout and a
"mobile mode" for iOS/Termius. Make the TUI look polished, not plain text.

## Environment
- Host: Nobara Linux (Fedora-based, rolling, gaming/creator focused). Editions:
  Official (custom KDE), GNOME, KDE, Steam-HTPC, Steam-Handheld.
- Work in `~/claudemod/nobara-bar` (a new directory inside this repo). Commit
  locally with conventional commits and NO AI co-author trailer. Do not push.
- Load the `plugin-authoring` skill first and follow its layout:
  `.claude-plugin/plugin.json`, `hooks/hooks.json` ({"modules":["./register.tsx"]}),
  `hooks/register.tsx`, and `types/index.d.ts` for `$.state` values (named in
  plugin.json as "types"). Develop in the hot-reload folder it names, then copy
  into the repo. Validate with `claude plugin validate`, test with
  `claude plugin test`.

## Behavior
1. Draw the bar in a `ui.render` hook on `{ component: 'PromptHint' }`. That is
   the line under the prompt, the bottom-most row, and it works in both modes.
   Return `next(e)` when the bar is off or has no data yet. Size to
   `e.viewport?.columns`.
2. Data: `await $.session.usage({ breakdown: 'summary', columns: 80 })`, then
   `context.breakdown`. Keep categories whose `kind` is not `deferred` and which
   have tokens (always keep `free`). Use each category's `color` (a theme key) so
   colors match /context. Refresh on session.start, prompt.submit, tool.call,
   turn.complete, and after toggling. Never call it from inside a render hook.
3. Segment widths: largest-remainder rounding so the cells sum to the bar width,
   and any non-empty used category gets at least 1 cell.
4. Command `/context-bar` (register in session.start via `$.command.register`,
   answer in a `command.run` hook with `{ text }`):
   - bare: toggle the bar on/off
   - `mobile`: toggle mobile mode (back to auto)
   - `desktop`: force the full layout
   - `auto`: switch by width (mobile at 56 columns or fewer)
5. Desktop row:
   `◢ CONTEXT <OS name+version> ╞████▒░░░╡ 58% 116k/200k ◌` with ◉ while working.
6. Mobile row, for Termius portrait: lead with the bold percent, then `▕…▏`
   around the bar, free space drawn as `·` (iOS fonts shimmer on ░), and the
   used-token count only if there are 40 columns or more. Percent and token
   count go blue under 70%, yellow from 70%, red from 85%.

## Nobara theming (read /etc/os-release via `$.fs.read`, with try/catch)
- Detect `ID=nobara` FIRST. Nobara reports
  `ID_LIKE="rhel centos fedora"`, so a naive "first ID_LIKE match" lookup would
  wrongly pick rhel. Verify the real file on this machine, since I only saw
  Nobara 39's. Use `VARIANT_ID` (kde, gnome, steamdeck-style) to pick a flavor
  tag, and `NAME` + `VERSION_ID` for the header label.
- Brand palette (from a third-party brand listing, so treat as approximate):
  accent `#7289D9`, deep `#2671B2`, highlight/alert `#F96855`. Use the coral
  for the hot (85%+) state and as a small accent in the header glyph. Keep a
  blue base. Fall back to a neutral blue for any other distro.
- Steam-HTPC / Steam-Handheld variants: default to mobile-style compact layout,
  since they run on small or distant screens.

## Gotchas learned on the last build
- The validator needs `on('literal-event-name', ...)` with string literals; do
  not loop over event names.
- Helper functions that take `$` must be top-level `function` declarations.
- `$.state` values go through `atom/read/update`, never module variables
  (hot reload resets them). Declare every value in `types/index.d.ts` under
  `PluginState['nobara-bar']`.
- Keep pure logic (cell allocation, token formatting, os-release parsing, mode
  parsing) in separate files and cover it with `*.test.ts`; include a Nobara
  os-release fixture test that proves `ID=nobara` beats `ID_LIKE` matching.
- The PromptHint row replaces the engine's hint text (like "esc to interrupt");
  say so in the README.

## Deliverables
- Working, validated, tested mod; README with install
  (`claude --plugin-dir ~/claudemod/nobara-bar`) and the command table; local commits.
- Tell me what you could not verify (rendering on my phone, the real
  os-release on this box) instead of claiming it works.

## Reference
The original Fedora version of this mod lives on amarillo at
`/home/jalsarraf/git/claudemod/context-bar` (commits d32508d..7bee5c9). If you
can reach it, read it first and port it; otherwise build from this spec.
