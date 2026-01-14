import { runGit } from './shell.js'


export const isGitRepo = async (dir?: string) => {
  const target = dir ? `./${ dir }` : '.'
  const res = await runGit([
    '-C',
    target,
    'rev-parse',
    '--is-inside-work-tree',
  ])
  return !!res
}

export const getGitConfig = (key: string, global: boolean = true) => {
  const g = global ? [ '--global' ] : []
  return runGit([ 'config', ...g, key ])
}

export const getGitRemoteUrl = async (remoteName = 'origin') => {
  return runGit([ 'remote', 'get-url', remoteName ])
    .catch(_ => runGit([ 'config', '--get', `remote.${ remoteName }.url` ]))
}
