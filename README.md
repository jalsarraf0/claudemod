# claudemod

Claude Code enhancement suite. **[Cyberdeck](cyberdeck/README.md)** is the operations HUD and Codex/Grok task router; the context bars are optional focused displays. Each component is a plugin: load it with `claude --plugin-dir <dir>`.

| Mod | What it does |
| --- | --- |
| [context-bar](context-bar/) | Stacked context-window bar on the bottom row (the hint line under the prompt), one color per `/context` category, themed to the host OS (Fedora blue on Fedora). Built on amarillo. |
| [nobara-bar](nobara-bar/) | The Nobara port: same idea, Nobara-themed, with a mobile layout for Termius. Built on dominus-nobara. |
| [cyberdeck](cyberdeck/) | Model/provider, context, native and routed agents, configured MCP enablement, Git/worktree state, responsive status, and Codex/Grok smart routing. See [installation, commands and limits](cyberdeck/README.md). |

`context-bar` and `nobara-bar` both register `/context-bar`, so load only one of them in a session.

## context-bar

Load with `claude --plugin-dir ./context-bar`.

### Mobile mode (iOS / Termius)

`/context-bar mobile` switches to a compact one-row layout for phone-width
terminals (short label, stacked bar, percent). By default the
bar is in `auto` and goes mobile at 56 columns or fewer, so Termius portrait
needs no setup. `/context-bar desktop` forces the full layout, `/context-bar auto`
restores width detection, and bare `/context-bar` toggles the bar on and off.

## nobara-bar

See [nobara-bar/README.md](nobara-bar/README.md). Its full build spec is
[prompts/nobara-bar.md](prompts/nobara-bar.md).

## Checks

Run `npm ci`, `npm run validate`, `npm run typecheck`, and `npm test`. GitHub Actions runs the same checks for every pull request. See [Cyberdeck development notes](cyberdeck/README.md#development-and-verification) for the distinction between pure-module TypeScript checks and native hook validation.
