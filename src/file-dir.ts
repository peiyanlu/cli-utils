import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'


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

export const readSubDirs = async (source: string, ignore: string[] = []) => {
  const res = await readdir(source, { withFileTypes: true })
  return res
    .filter(k => k.isDirectory() && !ignore.includes(k.name))
    .map(dir => dir.name)
}

export const copyDirAsync = async (
  src: string,
  dest: string,
  options?: {
    rename?: Record<string, string>
    skips?: ((name: string, isDir: boolean) => boolean)[]
  },
) => {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const name = entry.name
    const isDir = entry.isDirectory()
    
    const { rename = {}, skips = [] } = options ?? {}
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

export const editFile = async (
  file: string,
  callback: (content: string) => Promise<string> | string,
) => {
  if (!existsSync(file)) return
  const content = await readFile(file, 'utf-8')
  return writeFile(file, await callback(content), 'utf-8')
}

export const editJsonFile = async <T extends Record<string, any>>(
  file: string,
  callback: (json: T) => Promise<void> | void,
) => {
  return editFile(file, async (str) => {
    try {
      const json = JSON.parse(str) as T
      await callback(json)
      return JSON.stringify(json, null, 2)
    } catch (e) {
      console.error(e)
      return str
    }
  })
}

export const readJsonFile = <T extends Record<string, any>>(file: string) => {
  if (!existsSync(file)) return {} as T
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T
  } catch (e) {
    return {} as T
  }
}
