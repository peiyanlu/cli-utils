import { clean, coerce, parse, prerelease, valid } from 'semver'


export const isPrerelease = (version: string) => {
  return Boolean(prerelease(version))
}

export const isValid = (version: string) => {
  return Boolean(valid(version))
}

export const cleanVersion = (version: string) => {
  return clean(version) ?? version
}

export const parseVersion = (raw: string) => {
  const version = isValid(raw) ? raw : coerce(raw)?.toString()
  if (!version) return {}
  
  const { prerelease } = parse(version)!
  const isPrerelease = Boolean(prerelease.length)
  const [ preId, preBase ] = prerelease.map(String)
  
  return { version, isPrerelease, preId, preBase }
}
