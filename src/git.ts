import { resolve } from 'node:path'
import { runGit, runGitSync } from './shell.js'


/** 判断指定目录是否是 git 仓库 */
export const isGitRepo = async (dir: string = '.') => {
  const target = resolve(process.cwd(), dir)
  const res = await runGit([
    '-C',
    target,
    'rev-parse',
    '--is-inside-work-tree',
  ]).catch(err => {
    if (err?.message?.includes('safe.directory')) {
      console.warn(
        `⚠️ Git safe.directory restrictions: Please run:\n` +
        `git config --global --add safe.directory ${ target }`,
      )
    }
    return false
  })
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

/** 获取当前分支 */
export const getCurrentBranch = async () => {
  let branch = await runGit([ 'branch', '--show-current' ])
  
  if (!branch) {
    // fallback for very old git
    branch = await runGit([ 'rev-parse', '--abbrev-ref', 'HEAD' ])
    if (branch === 'HEAD') return undefined
  }
  
  return branch
}

/** 获取分支关联的远程地址 */
export const getRemoteForBranch = (branch: string) => {
  return runGit([ 'config', '--get', `branch.${ branch }.remote` ])
}

/** 获取关联的所有远程地址 */
export const getAllRemotes = async () => {
  const res = await runGit([ 'remote' ])
  return res?.split('\n').filter(Boolean) ?? []
}

/** 获取默认的远程地址 */
export const getDefaultRemote = async (branch?: string) => {
  const targetBranch = branch || await getCurrentBranch()
  return targetBranch ? await getRemoteForBranch(targetBranch) : undefined
}

/** 获取默认远程地址之外的远程地址 */
export const getOtherRemotes = async (branch?: string) => {
  const defaultRemote = await getDefaultRemote(branch)
  const all = await getAllRemotes()
  return all.filter(r => r !== defaultRemote)
}

/** 提取所有分支 */
export const fetchAllBranch = (remoteName = 'origin') => {
  return runGit([
    'fetch',
    remoteName,
    '--recurse-submodules=no',
    '--prune',
  ])
}

/**
 * 获取本地所有 tag
 * @returns {Promise<string[]>}
 * @defaults git tag --list
 */
export const getLocalTags = async (): Promise<string[]> => {
  const tags = await runGit([ 'tag', '--list' ])
  return tags
    ? tags
      .split('\n')
      .filter(Boolean)
    : []
}

/** 获取远程 tags */
export const getSortedTags = async (
  match: string = '*',
  exclude: string = '*-beta.*',
  sort: 'v:refname' | 'creatordate' = 'v:refname',
  count: number = 0,
) => {
  const res = await runGit([
    'for-each-ref',
    '--format=%(refname:short)',
    `--sort=-${ sort }`,
    `--exclude=${ exclude }`,
    `--count=${ count }`,
    `refs/tags/${ match }`,
  ])
  return res
    ? res
      .split('\n')
      .filter(Boolean)
    : []
}

/**
 * 获取远程（或所有 refs）中的 tag
 * 使用 for-each-ref 以支持版本号排序
 * @param {string} match 默认 *
 * @param {string} exclude 默认 beta
 * @returns {Promise<string[]>}
 * @defaults git for-each-ref --sort=-v:refname --format=%(refname:short) refs/tags/<match>
 */
export const getRemoteTags = async (match: string = '*', exclude: string = '*-beta.*'): Promise<string[]> => {
  return getSortedTags(match, exclude)
}

/**
 * 获取当前工作区状态（不包含未跟踪文件）
 * @returns {Promise<string | undefined>}
 * @defaults git status --short --untracked-files=no
 */
export const getStatus = (): Promise<string | undefined> => {
  return runGit([ 'status', '--short', '--untracked-files=no' ], { trim: false })
}

/**
 * 为 git status / changeset 输出添加颜色
 *
 * M -> 黄色（修改）
 * A -> 绿色（新增）
 * D -> 红色（删除）
 * @param {string} log git status --short 输出
 * @returns {string}
 */
export const coloredChangeset = (log: string): string => {
  const colorStatusChar = (ch: string) => {
    switch (ch) {
      case 'M':
        return `\x1b[33m${ ch }\x1b[0m\x1b[2m` // yellow
      case 'A':
        return `\x1b[32m${ ch }\x1b[0m\x1b[2m` // green
      case 'D':
        return `\x1b[31m${ ch }\x1b[0m\x1b[2m` // red
      default:
        return ch
    }
  }
  
  const colorStatus = (status: string) => status
    .split('')
    .map(colorStatusChar)
    .join('')
  
  return log
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2)
      const file = line.slice(3)
      return `${ colorStatus(status) } ${ file }`
    })
    .join('\n')
}

/**
 * 获取当前分支对应的远程信息
 * @returns {Promise<{remoteName: string, remoteUrl: string | undefined}>}
 */
export const getRemote = async (): Promise<{ remoteName: string; remoteUrl: string | undefined }> => {
  const branch = await getCurrentBranch()
  const remoteName = (branch && await getRemoteForBranch(branch)) || 'origin'
  
  const remoteUrl = await runGit([ 'remote', 'get-url', remoteName ])
    .catch(_ => runGit([ 'config', '--get', `remote.${ remoteName }.url` ]))
  
  return { remoteName, remoteUrl }
}

/**
 * 获取最新 tag
 *
 * 默认：
 * - 匹配所有 tag
 * - 排除 beta 版本
 * @param {string} match 默认 *
 * @param {string} exclude 默认 beta
 * @returns {Promise<string | undefined>}
 */
export const getLatestTag = async (
  match: string = '*',
  exclude: string = '*-beta.*',
): Promise<string | undefined> => {
  const [ latestTag ] = await getSortedTags(match, exclude, undefined, 1)
  return latestTag
}

/**
 * 获取上一个 tag
 *
 * 默认：
 * - 匹配所有 tag
 * - 排除 beta 版本
 * @param {string} latestTag
 * @param {string} match 默认 *
 * @param {string} exclude 默认 beta
 * @returns {Promise<string | undefined>}
 */
export const getPreviousTag = async (
  latestTag: string,
  match: string = '*',
  exclude: string = '*-beta.*',
): Promise<string | undefined> => {
  const all = await getSortedTags(match, exclude, undefined, 2)
  const index = all.findIndex(k => latestTag === k)
  return all[index + 1]
}

/**
 * 计算 changelog 的 commit 范围
 * @param {boolean} isIncrement 是否为版本递增发布
 * @param {string} match tag match
 * @param {string} exclude tag exclude
 * @returns {Promise<{from: string, to: string}>}
 */
export const resolveChangelogRange = async (
  isIncrement: boolean = true,
  match: string = '*',
  exclude: string = '*-beta.*',
): Promise<{ from: string; to: string; }> => {
  const latestTag = await getLatestTag(match, exclude)
  if (!latestTag) {
    return { from: '', to: 'HEAD' }
  }
  
  const previousTag = await getPreviousTag(latestTag)
  if (!isIncrement && previousTag) {
    return { from: previousTag, to: `${ latestTag }^1` }
  }
  
  return { from: latestTag, to: 'HEAD' }
}

/**
 * 将短 hash 解析为完整 hash
 * @param {string} short
 * @returns {Promise<string | undefined>}
 */
export const getFullHash = (short: string): Promise<string | undefined> => {
  return runGit([ 'rev-parse', short ])
}

/**
 * 获取指定范围内的 commit 日志
 * @param {string} from
 * @param {string} to
 * @param {string} scope 文件或目录范围
 * @returns {Promise<string | undefined>}
 */
export const getLog = async (from: string = '', to: string = 'HEAD', scope?: string): Promise<string | undefined> => {
  const cmd = [ 'log', `--pretty=format:* %s (%h)` ]
  if (from) cmd.push(`${ from }...${ to }`)
  if (scope) cmd.push(...[ '--', scope ])
  
  return runGit(cmd, { trim: false })
}

/**
 * 判断工作区是否干净（无未提交修改）
 * @returns {Promise<boolean>}
 */
export const isWorkingDirClean = async (): Promise<boolean> => {
  const status = await runGit([ 'status', '-s' ])
  return status?.length === 0
}

/** 判断字符串是否为合法 remote 名称 */
export const isRemoteName = (remoteName: string) => {
  return remoteName && !remoteName.includes('/')
}

/** 判断当前分支是否已设置 upstream */
export const hasUpstreamBranch = async () => {
  const ref = await runGit([ 'symbolic-ref', 'HEAD' ])
  const branch = await runGit([ 'for-each-ref', '--format=%(upstream:short)', ref! ])
  return Boolean(branch)
}

/** 获取 push 所需的 upstream 参数 */
export const getUpstreamArgs = async (remoteName: string, branch?: string) => {
  const hasUpstream = await hasUpstreamBranch()
  const target = branch || await getCurrentBranch()
  
  if (!hasUpstream) {
    return [ '--set-upstream', remoteName, target! ]
  }
  
  return [ remoteName, target! ]
}

/** 统计自最新 tag 以来的提交数量 */
export const countCommitsSinceLatestTag = async () => {
  const latestTag = await getLatestTag()
  const ref = latestTag ? `${ latestTag }...HEAD` : 'HEAD'
  return runGit([ 'rev-list', ref, '--count' ]).then(Number)
}

/** git add（包含未追踪文件） */
export const gitAddAll = async (args: string[] = []): Promise<void> => {
  await runGit([ 'add', '--all', ...args ])
}
/** git add（仅已追踪文件） */
export const gitAddTracked = async (args: string[] = []): Promise<void> => {
  await runGit([ 'add', '--update', ...args ])
}

/** git commit */
export const gitCommit = async (message: string, args: string[] = []): Promise<void> => {
  await runGit([ 'commit', '--message', message, ...args ])
}

/** git commit amend */
export const gitCommitAmend = async (message: string, args: string[] = []): Promise<void> => {
  await runGit([ 'commit', '--amend', '--message', message, ...args ])
}

/** 创建 annotated tag */
export const gitTagAnnotated = async (
  tag: string,
  message: string = tag,
  args: string[] = [],
): Promise<void> => {
  await runGit([ 'tag', '--annotate', '--message', message, tag, ...args ])
}

/** 创建 lightweight tag */
export const gitTagLightweight = async (
  tag: string,
  message: string = tag,
  args: string[] = [],
): Promise<void> => {
  await runGit([ 'tag', '--message', message, tag, ...args ])
}


/**
 * 推送 tag 到远程
 * @param {string} remoteName
 * @param {string} tag
 * @param {string[]} args
 * @returns {Promise<string | undefined>}
 * @defaults git push <remoteName> refs/tags/<tag>
 */
export const pushTag = async (remoteName: string, tag: string, args: string[] = []): Promise<void> => {
  await runGit([ 'push', remoteName, `refs/tags/${ tag }`, ...args ])
}

/**
 * 推送分支到远程
 * 自动处理 upstream 设置
 * @param {string} remoteName
 * @param {string} branch
 * @param {string[]} args
 * @returns {Promise<string | undefined>}
 */
export const pushBranch = async (
  remoteName: string,
  branch?: string,
  args: string[] = [],
): Promise<void> => {
  const upstreamArgs = await getUpstreamArgs(remoteName, branch)
  await runGit([ 'push', ...upstreamArgs, ...args ])
}


/**
 * 撤销【工作区】中某个文件的修改（未暂存的改动）
 * - 不影响暂存区
 * - 不影响提交历史
 * - ⚠️ 会丢弃该文件当前未暂存的修改
 *
 * 等价命令：git restore <file>
 */
export const restoreFile = async (file: string): Promise<void> => {
  await runGit([ 'restore', file ])
}

/**
 * 撤销【工作区】中所有未暂存的修改
 * - 不影响暂存区
 * - 不影响提交历史
 * - ⚠️ 会丢弃所有未暂存的修改
 *
 * 等价命令：git restore .
 */
export const restoreAll = async (): Promise<void> => {
  await runGit([ 'restore', '.' ])
}

/**
 * 将某个文件从【暂存区】移回【工作区】
 * - 保留文件修改
 * - 仅取消 git add 的效果
 *
 * 等价命令：git restore --staged <file>
 */
export const unstageFile = async (file: string): Promise<void> => {
  await runGit([ 'restore', '--staged', file ])
}

/**
 * 取消所有文件的暂存状态
 * - 保留所有文件修改
 * - 清空暂存区
 *
 * 等价命令：git restore --staged .
 */
export const unstageAll = async (): Promise<void> => {
  await runGit([ 'restore', '--staged', '.' ])
}

/**
 * 丢弃某个文件的所有修改（暂存 + 未暂存）
 * - 先取消暂存
 * - 再撤销工作区修改
 * - ⚠️ 修改内容将彻底丢失
 *
 * 等价操作：
 *   git restore --staged <file>
 *   git restore <file>
 */
export const discardFile = async (file: string): Promise<void> => {
  await unstageFile(file)
  await restoreFile(file)
}

/**
 * 丢弃所有修改（包括暂存和未暂存的文件）
 *
 * 作用：
 * - 将暂存区和工作区全部重置到当前 HEAD 提交状态
 * - 丢弃所有未提交的更改，无法恢复（除非使用 reflog）
 *
 * ⚠️ 高风险操作，请确保已备份重要修改
 *
 * 等价命令：
 *   git reset --hard HEAD
 */
export const discardAll = async (): Promise<void> => {
  await runGit([ 'reset', '--hard', 'HEAD' ])
}

/**
 * 撤销最近的 commit（软回退）
 * - 提交历史回退
 * - 修改内容保留
 * - 修改仍在【暂存区】
 *
 * 常用于：刚提交但还想改点东西
 *
 * 等价命令：git reset --soft HEAD~<count>
 */
export const resetSoft = async (count: number = 1): Promise<void> => {
  await runGit([ 'reset', '--soft', `HEAD~${ count }` ])
}

/**
 * 撤销最近的 commit（混合回退，默认行为）
 * - 提交历史回退
 * - 修改内容保留
 * - 修改回到【工作区】，不再暂存
 *
 * 等价命令：git reset --mixed HEAD~<count>
 */
export const resetMixed = async (count: number = 1): Promise<void> => {
  await runGit([ 'reset', '--mixed', `HEAD~${ count }` ])
}

/**
 * 撤销最近的 commit（强制回退）
 * - 提交历史回退
 * - ⚠️ 所有修改全部丢弃
 *
 * ⚠️ 高危操作，请谨慎使用
 *
 * 等价命令：git reset --hard HEAD~<count>
 */
export const resetHard = async (count: number = 1): Promise<void> => {
  await runGit([ 'reset', '--hard', `HEAD~${ count }` ])
}

/**
 * 安全撤销一个已提交（并可能已 push）的 commit
 * - 不改写提交历史
 * - 生成一个新的反向提交
 *
 * 适用于：公共分支 / 已推送到远端
 *
 * 等价命令：git revert <commit>
 */
export const revertCommit = async (hash: string): Promise<void> => {
  await runGit([ 'revert', hash ])
}

/**
 * 将某个文件恢复到指定 commit 的状态
 * - 仅影响该文件
 * - 会覆盖当前工作区中的该文件
 * - 不自动提交
 *
 * 等价命令：git restore --source=<commit> <file>
 */
export const restoreFileFromCommit = async (file: string, commit: string): Promise<void> => {
  await runGit([ 'restore', `--source=${ commit }`, file ])
}

/**
 * 将当前目录下的所有文件恢复到指定 commit 的状态
 *
 * 行为说明：
 * - 仅影响【工作区（Working Tree）】
 * - 不影响暂存区（Index）
 * - 不修改提交历史
 *
 * ⚠️ 风险提示：
 * - 会覆盖当前工作区中的所有文件
 * - 所有未暂存的修改将被永久丢弃
 *
 * 适用场景：
 * - 批量回退文件内容到某个历史版本
 * - 修复误操作、误格式化、误生成文件等情况
 *
 * 等价命令：
 *   git restore --source=<commit> .
 */
export const restoreFromCommit = async (commit: string): Promise<void> => {
  await runGit([ 'restore', `--source=${ commit }`, '.' ])
}

/** 删除本地 tag */
export const deleteTag = async (tag: string) => {
  await runGit([ 'tag', '--delete', tag ])
}

/** {@link restoreAll} 的同步版本 */
export const restoreAllSync = () => {
  runGitSync([ 'restore', '.' ])
}

/** {@link deleteTag} 的同步版本 */
export const deleteTagSync = (tag: string) => {
  runGitSync([ 'tag', '--delete', tag ])
}

/** {@link discardAll} 的同步版本 */
export const discardAllSync = () => {
  runGitSync([ 'reset', '--hard', 'HEAD' ])
}

/** {@link resetHard} 的同步版本 */
export const resetHardSync = (count: number = 1) => {
  runGitSync([ 'reset', '--hard', `HEAD~${ count }` ])
}

export const gitUndo = {
  file: {
    restore: restoreFile,
    unstage: unstageFile,
    discard: discardFile,
  },
  all: {
    restore: restoreAll,
    unstage: unstageAll,
    discard: discardAll,
  },
  reset: {
    soft: resetSoft,
    mixed: resetMixed,
    hard: resetHard,
  },
  revert: revertCommit,
}
