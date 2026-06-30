import { resolve } from 'node:path'
import { readJsonFile } from './file-dir.js'
import { PkgInfo } from './types.js'


export const isScopedPackageName = (name: string) =>
  /^@[a-z0-9-]+\/.+$/.test(name)

export const isValidPackageName = (name: string) =>
  /^(?:@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._~-]*$/.test(name)

export const toValidPackageName = (name: string) => name
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/^[._]/, '')
  .replace(/[^a-z\d\-~]+/g, '-')

export const toValidProjectName = (name: string) => name
  .trim()
  .replace(/\/+$/g, '')

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

/**
 * 通过包管理器执行脚本时生效
 * @defaults UserAgent: `process.env.npm_config_user_agent`
 */
export const pkgFromUserAgent = (userAgent?: string): PkgInfo | undefined => {
  if (!userAgent) return undefined
  const [ pkgSpec ] = userAgent.split(' ')
  const [ name, version ] = pkgSpec.split('/')
  return { name, version } satisfies PkgInfo
}
