import { expect, test } from 'claude-code/testing'
import { gitFromOutput } from '../hooks/lib/git'

test('Git porcelain identifies dirty worktrees and upstream divergence', () => {
  expect(gitFromOutput('# branch.oid abc\n# branch.head fix/hud\n# branch.upstream origin/main\n# branch.ab +2 -3\n? untracked.txt\n', '/repo/fix\n/repo/.git/worktrees/fix\n/repo/.git\n')).toEqual({ branch: 'fix/hud', dirty: true, ahead: 2, behind: 3, worktree: true, root: '/repo/fix' })
})
test('detached and unborn branches are readable without invented upstream counts', () => {
  const paths = '/repo\n/repo/.git\n/repo/.git\n'
  expect(gitFromOutput('# branch.oid abc123456789\n# branch.head (detached)\n', paths)).toEqual({ branch: 'detached abc1234', dirty: false, ahead: null, behind: null, worktree: false, root: '/repo' })
  expect(gitFromOutput('# branch.oid (initial)\n# branch.head main\n', paths)?.branch).toBe('main')
})
test('incomplete Git output is unavailable', () => {
  expect(gitFromOutput('', '')).toBe(null)
})
