import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { EOL } from 'node:os'
import { join, resolve } from 'node:path'
import { CopyOptions, PkgInfo } from './types.js'


export const isValidPackageName = (packageName: string) => {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(packageName)
}

export const toValidPackageName = (packageName: string) => packageName
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/^[._]/, '')
  .replace(/[^a-z\d\-~]+/g, '-')

export const toValidProjectName = (projectName: string) => projectName
  .trim()
  .replace(/\/+$/g, '')

export const emptyDir = async (dir: string, ignore: string[] = []) => {
  if (!existsSync(dir)) {
    return false
  }
  for (const file of await readdir(dir)) {
    if (ignore.includes(file)) {
      continue
    }
    await rm(resolve(dir, file), { recursive: true, force: true })
  }
  return true
}

export const isEmpty = async (path: string, ignore: string[] = []) => {
  const files = await readdir(path)
  const filtered = files.filter(f => !ignore.includes(f))
  return filtered.length === 0
}

export const editFile = async (file: string, callback: (content: string) => string) => {
  if (!existsSync(file)) return
  const content = await readFile(file, 'utf-8')
  return writeFile(file, callback(content), 'utf-8')
}

export const editJsonFile = <T extends Record<string, any>>(file: string, callback: (json: T) => void) => {
  return editFile(file, (str) => {
    try {
      const json = JSON.parse(str) as T
      callback(json)
      return JSON.stringify(json, null, 2)
    } catch (e) {
      console.error(e)
      return str
    }
  })
}

export const readSubDirs = async (source: string, ignore: string[] = []) => {
  const res = await readdir(source, { withFileTypes: true })
  return res
    .filter(k => k.isDirectory() && !ignore.includes(k.name))
    .map(dir => dir.name)
}

export const copyDirAsync = async (src: string, dest: string, options: CopyOptions) => {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const name = entry.name
    const isDir = entry.isDirectory()
    
    const { rename = {}, skips = [] } = options
    const relName = rename[name] ?? name
    if (skips.some(rule => rule(name, isDir))) {
      continue
    }
    
    const from = join(src, name)
    const to = join(dest, relName)
    if (isDir) {
      await copyDirAsync(from, to, options)
    } else {
      await copyFile(from, to)
    }
  }
}

export const readJsonFile = <T extends Record<string, any>>(file: string) => {
  if (!existsSync(file)) return {} as T
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T
  } catch (e) {
    return {} as T
  }
}

export const getPackageInfo = (pkgName: string, getPkgDir: (pkg: string) => string) => {
  const pkgDir = resolve(getPkgDir(pkgName))
  const pkgPath = resolve(pkgDir, 'package.json')
  const pkg = readJsonFile(pkgPath) as {
    name: string;
    version: string;
    private?: boolean;
    publishConfig?: {
      access: string
      registry: string
      [key: string]: string
    };
  }
  
  return { pkg, pkgDir, pkgPath }
}


/** 通过包管理器执行脚本时生效 UserAgent: `process.env.npm_config_user_agent` */
export const pkgFromUserAgent = (userAgent: string | undefined): PkgInfo | undefined => {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const [ name, version ] = pkgSpec.split('/')
  return { name, version } satisfies PkgInfo
}

/** 判断测试文件（夹） */
export const isTestFile = (name: string) => {
  return [
    /(^|[\\/])(test(s?)|__test(s?)__)([\\/]|$)/,
    /\.([a-zA-Z0-9]+-)?(test|spec)\.m?(ts|js)$/,
    /^vitest([-.])(.*)\.m?(ts|js)$/,
  ].some(reg => reg.test(name))
}

/** 解析 Github 链接获取 owner 和 repo */
export const parseGitHubRepo = (url: string) => {
  const reg = /github(?:\.com)?[:/](.+?)\/(.+?)(?:[#/?].+?)?(?:\.git)?$/
  const match = url.trim().match(reg)
  return match ? match.slice(1, 3) : []
}

/** 基于 EOL 的可多换行函数 */
export const eol = (n: number = 1) => EOL.repeat(n)

/** 多空格函数 */
export const space = (n: number = 1) => ' '.repeat(n)

/** 将字符串以空格分割为数组 */
export const parseArgs = (args: string) =>
  args.trim() ? args.trim().split(space()) : []

/** 将数组以空格拼接为字符串 */
export const stringifyArgs = (args: string[]) =>
  args.length ? args.join(space()) : ''


/** 去掉模板字符串首尾换行 */
export const trimTemplate = (str: string) =>
  str.replace(/^\s*\n+|\n+\s*$/g, '')

/** 生成 GitHub 仓库主页地址 */
export const getGithubUrl = (owner: string, repo: string) => {
  return `https://github.com/${ owner }/${ repo }`
}

/** 生成 GitHub Release 页面地址 */
export const getGithubReleaseUrl = (owner: string, repo: string, tag: string) => {
  return `${ getGithubUrl(owner, repo) }/releases/tag/${ encodeURIComponent(tag) }`
}

/** 生成 npm 包指定版本的详情页地址 */
export const getPackageUrl = (pkg: string, version: string) => {
  return `https://www.npmjs.com/package/${ pkg }/v/${ version }`
}

/** 字符串按换行符分割并过滤 */
export const splitLines = (text: string) => {
  return text.split(/\r?\n/).filter(Boolean)
}
