export type GitState = {
  branch: string
  dirty: boolean
  ahead: number | null
  behind: number | null
  worktree: boolean
  root: string
}

/** Parse only branch metadata and dirty state; never retain file names. */
export function gitFromOutput(status: string, paths: string): GitState | null {
  const [root, gitDir, commonDir] = paths.trim().split('\n')
  const rows = status.split('\n')
  const head = rows.find(row => row.startsWith('# branch.head '))?.slice(14)
  if (!root || !gitDir || !commonDir || !head) return null
  const oid = rows.find(row => row.startsWith('# branch.oid '))?.slice(13)
  const ab = /^# branch.ab \+(\d+) -(\d+)$/m.exec(status)
  return {
    branch: head === '(detached)' ? `detached ${oid?.slice(0, 7) || 'HEAD'}` : head,
    dirty: rows.some(row => /^[12u?] /.test(row)),
    ahead: ab ? Number(ab[1]) : null,
    behind: ab ? Number(ab[2]) : null,
    worktree: gitDir !== commonDir,
    root,
  }
}
