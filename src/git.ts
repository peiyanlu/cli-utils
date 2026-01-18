import { resolve } from 'node:path'
import { runGit } from './shell.js'


/** 判断指定目录是否是 git 仓库 */
export const isGitRepo = async (dir?: string) => {
  const target = resolve(process.cwd(), dir || '.')
  const res = await runGit([
    '-C',
    target,
    'rev-parse',
    '--is-inside-work-tree',
  ])
  return 'true' === res
}

/** 获取指定的 git 配置 */
export const getGitConfig = (key: string, global: boolean = true) => {
  const g = global ? [ '--global' ] : []
  return runGit([ 'config', ...g, key ])
}

/** 获取 git 远程地址 */
export const getGitRemoteUrl = async (remoteName = 'origin') => {
  return runGit([ 'remote', 'get-url', remoteName ])
    .catch(_ => runGit([ 'config', '--get', `remote.${ remoteName }.url` ]))
}
