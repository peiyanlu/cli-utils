import { clean, coerce, parse, prerelease, valid } from 'semver'


/** 是否是预发行版本 */
export const isPrerelease = (version: string) => {
  return Boolean(prerelease(version))
}

/** 是否是合法版本号 */
export const isValidVersion = (version: string) => {
  return Boolean(valid(version))
}

/** 清理版本号 */
export const cleanVersion = (version: string) => {
  return clean(version) ?? version
}

/** 解析版本号 */
export const parseVersion = (raw: string) => {
  const version = isValidVersion(raw) ? raw : coerce(raw)?.toString()
  if (!version) return {}
  
  const { prerelease } = parse(version)!
  
  const isPrerelease = prerelease.length > 0
  const [ _id, _base ] = prerelease
  const preId = typeof _id === 'string' ? _id : undefined
  const preBase = typeof _base === 'number' ? String(_base) : undefined
  
  return { version, isPrerelease, preId, preBase }
}
