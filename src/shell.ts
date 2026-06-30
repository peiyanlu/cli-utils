import type { ExecAsyncOpts, ExecSyncOpts, SpawnAsyncOpts, SpawnSyncOpts } from './shell/index.js'
import { execAsync, execSyncWithString, spawnAsync, spawnSyncWithString } from './shell/index.js'


/** 基于 {@link spawnAsync} 实现 */
export const runGit = async (args: string[], options?: SpawnAsyncOpts) => {
  return spawnAsync('git', args, { trimEnd: true, ...options })
}

/** 基于 {@link spawnSyncWithString} 实现 */
export const runGitSync = (args: string[], options?: SpawnSyncOpts) => {
  return spawnSyncWithString('git', args, { trimEnd: true, ...options })
}

/** 基于 {@link execAsync} 实现 */
export const runNpm = (args: string[], options?: ExecAsyncOpts) => {
  return execAsync('npm', args, { trimEnd: true, ...options })
}

/** 基于 {@link execSyncWithString} 实现 */
export const runNpmSync = (args: string[], options?: ExecSyncOpts) => {
  return execSyncWithString('npm', args, { trimEnd: true, ...options })
}

/** 基于 {@link spawnAsync} 实现 */
export const runNode = (args: string[], options?: SpawnAsyncOpts) => {
  return spawnAsync('node', args, { trimEnd: true, ...options })
}

/** 基于 {@link spawnSyncWithString} 实现 */
export const runNodeSync = (args: string[], options?: SpawnSyncOpts) => {
  return spawnSyncWithString('node', args, { trimEnd: true, ...options })
}


/** 支持所有支持 `--version` 命令的脚本查看版本 */
export const checkVersion = async (cmd: string) => {
  return execAsync(cmd, [ '--version' ], { trimEnd: true })
}

export const checkVersionSync = async (cmd: string) => {
  return execSyncWithString(cmd, [ '--version' ], { trimEnd: true })
}
