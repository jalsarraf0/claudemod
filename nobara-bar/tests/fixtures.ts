import type { ContextCategory, SessionContextBreakdown } from 'claude-code'

// /etc/os-release as read on dominus-nobara, 2026-10-03.
export const NOBARA_44_KDE = `NAME="Nobara Linux"
VERSION="44 (KDE Plasma Desktop Edition)"
ID=nobara
ID_LIKE="rhel centos fedora"
VERSION_ID=44
VERSION_CODENAME=""
PLATFORM_ID="platform:f44"
PRETTY_NAME="Nobara Linux 44 (KDE Plasma Desktop Edition)"
ANSI_COLOR="0;38;2;60;110;180"
LOGO=nobara-logo-icon
CPE_NAME="cpe:/o:nobaraproject:nobara:44"
DEFAULT_HOSTNAME="nobara"
HOME_URL="https://nobaraproject.org/"
DOCUMENTATION_URL="https://wiki.nobaraproject.org/"
SUPPORT_URL="https://www.nobaraproject.org/"
BUG_REPORT_URL="https://github.com/nobara-project/rpm-baseos"
REDHAT_BUGZILLA_PRODUCT="Nobara"
REDHAT_BUGZILLA_PRODUCT_VERSION=44
REDHAT_SUPPORT_PRODUCT="Nobara"
REDHAT_SUPPORT_PRODUCT_VERSION=44
SUPPORT_END=2026-12-02
VARIANT="KDE Plasma Desktop Edition"
VARIANT_ID=kde
`

// Assumed shape: the real Steam-Handheld VARIANT/VARIANT_ID were not seen.
export const NOBARA_STEAM_HANDHELD = `NAME="Nobara Linux"
ID=nobara
ID_LIKE="rhel centos fedora"
VERSION_ID=44
VARIANT="Steam Handheld Edition"
VARIANT_ID=steam-handheld
`

export const FEDORA_44 = `NAME="Fedora Linux"
ID=fedora
VERSION_ID=44
VARIANT_ID=workstation
`

export const ROCKY_9 = `NAME="Rocky Linux"
ID="rocky"
ID_LIKE="rhel centos fedora"
VERSION_ID="9.4"
`

function category(name: string, tokens: number, color: string, kind: ContextCategory['kind']): ContextCategory {
  return { name, tokens, color, kind, isDeferred: kind === 'deferred' }
}

export function breakdown(overrides: Partial<SessionContextBreakdown> = {}): SessionContextBreakdown {
  return {
    categories: [
      category('System prompt', 3_000, 'promptBorder', 'used'),
      category('System tools', 17_000, 'inactive', 'used'),
      category('MCP tools (deferred)', 40_000, 'cyan_FOR_SUBAGENTS_ONLY', 'deferred'),
      category('Memory files', 2_000, 'claude', 'used'),
      category('Skills', 0, 'warning', 'used'),
      category('Messages', 94_000, 'purple_FOR_SUBAGENTS_ONLY', 'used'),
      category('Free space', 51_000, 'promptBorder', 'free'),
      category('Autocompact buffer', 33_000, 'inactive', 'buffer'),
    ],
    totalTokens: 116_000,
    maxTokens: 200_000,
    rawMaxTokens: 200_000,
    autocompactSource: 'auto',
    percentage: 58,
    gridRows: [],
    model: 'claude-opus-5-5',
    memoryFiles: [],
    mcpTools: [],
    agents: [],
    isAutoCompactEnabled: true,
    apiUsage: null,
    ...overrides,
  }
}
