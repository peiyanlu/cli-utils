import { splitLines } from '../utils.js'
import { gitRemote } from './raw.js'


/**
 * 获取 url
 * @defaults `git remote get-url <args>`
 */
export const gitRemoteGetUrl = (args: string[]) => {
  return gitRemote([ 'get-url', ...args ])
}

/**
 * 设置 url
 * @defaults `git remote set-url <args>`
 */
export const gitRemoteSetUrl = (args: string[]) => {
  return gitRemote([ 'set-url', ...args ])
}

/**
 * 添加远程
 * @defaults `git remote add <name> <url>`
 */
export const gitRemoteAdd = async (name: string, url: string) => {
  await gitRemote([ 'add', name, url ])
}

/**
 * 重命名远程
 * @defaults `git remote rename <old-name> <new-name>`
 */
export const gitRemoteRename = async (oldName: string, newName: string) => {
  await gitRemote([ 'rename', oldName, newName ])
}

/**
 * 移除远程
 * @defaults `git remote remove <name>`
 */
export const gitRemoteRemove = async (name: string) => {
  await gitRemote([ 'remove', name ])
}


// -----------------------------------------------------


/** 获取关联的所有远程 */
export const getRemoteNames = async () => {
  const res = await gitRemote([])
  return res ? splitLines(res) : []
}

/** 获取远程地址 */
export const getRemoteUrl = async (remote: string) => {
  return gitRemoteGetUrl([ remote ])
}

/** 获取所有远程 */
export const getRemoteList = async () => {
  const remotes = await getRemoteNames()
  return Promise.all(remotes.map(async name => {
    const url = await gitRemoteGetUrl([ name ])
    return { name, url }
  }))
}
