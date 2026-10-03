# nobara-bar

A Claude Code mod that draws your context window as a stacked bar on the
bottom row of the terminal UI. Each segment is one `/context` category in
the same color `/context` uses. The bar is themed for Nobara Linux.

```
◢ CONTEXT Nobara Linux 44 · KDE ╞█████████████▒▒▒▒▒▒░░░░░░░░╡ 58% 116k/200k ◌
```

On a phone (Termius portrait):

```
58% ▕██████████·········▏ 116k
```

## Install

```sh
claude --plugin-dir ~/claudemod/nobara-bar
```

`CLAUDE_CODE_PLUGIN_DIRS=~/claudemod/nobara-bar` in the environment, or in
the `env` block of `~/.claude/settings.json`, loads it in sessions where you
can't pass a flag (desktop app, SDK).

## Command

| Command | Effect |
| --- | --- |
| `/context-bar` | Toggle the bar on/off |
| `/context-bar mobile` | Toggle mobile layout (toggling again returns to auto) |
| `/context-bar desktop` | Force the full desktop layout |
| `/context-bar auto` | Choose by width: mobile at 56 columns or fewer (the default) |

Choosing a layout also turns the bar on.

## What it draws

- **Desktop:** `◢ CONTEXT <OS name+version · flavor> ╞bar╡ <percent> <used>/<window> ◌`.
  The status glyph turns to `◉` while a turn is running. As the row gets
  narrower it drops the flavor, then the OS label, then the word CONTEXT,
  then the token count. Below that it falls back to the mobile row.
- **Mobile:** bold percent first, then the bar inside `▕…▏`. Free space and
  the autocompact buffer are drawn as `·` because iOS fonts shimmer on `░`.
  The used-token count shows only at 40 columns or wider.
- **Segments:** used categories `█`, then the autocompact buffer `▒`, then
  free space `░` (dim). Deferred tool schemas are left out, as in the
  `/context` grid. Widths use largest-remainder rounding, so the cells always
  add up to the bar width. Any non-empty used category gets at least one cell.
- **Heat:** the percent and token count are blue under 70%, yellow from 70%
  and coral/red from 85%.

## Nobara theming

`/etc/os-release` is read once at session start. `ID=nobara` is checked
before anything else: Nobara reports `ID_LIKE="rhel centos fedora"`, so
matching on the first `ID_LIKE` entry would pick rhel. `NAME` + `VERSION_ID`
form the label, and `VARIANT_ID` picks the flavor tag (KDE, GNOME, HTPC,
Handheld, Steam).

| Role | Nobara | Other distros |
| --- | --- | --- |
| Accent / cool heat | `#7289D9` | `#5B8DEF` |
| Brackets | `#2671B2` | `#3B6FB6` |
| Header glyph / hot heat | `#F96855` (coral) | `#5B8DEF` / theme `error` |
| Warm heat | theme `warning` | theme `warning` |

The brand colors come from a third-party brand listing, so treat them as
approximate. On the Steam-HTPC and Steam-Handheld editions, auto mode
defaults to the compact mobile row.

## Caveats

- **It replaces the engine's hint line.** The bar draws on the `PromptHint`
  row, so while it shows you won't see `? for shortcuts`, `esc to interrupt`
  or the pills on that line. Run `/context-bar` to hide the bar and get them
  back.
- The breakdown is the local `summary` estimate, the same one `/context`
  starts from. It refreshes on session start, on prompt submit, after each
  tool call, on turn complete, and after any `/context-bar` command.

## Development

```sh
claude plugin validate ~/claudemod/nobara-bar
claude plugin test ~/claudemod/nobara-bar
```

The pure logic lives in `hooks/lib/` (cell allocation, token formatting,
os-release parsing, mode parsing, layout) and is covered by `tests/`.
`tests/hooks.test.ts` drives the hooks through the engine's test kit.
