import { ExecSyncOptionsWithStringEncoding, SpawnSyncOptionsWithStringEncoding } from 'child_process'
import { exec, execSync, spawn, spawnSync } from 'node:child_process'
import { dim, red } from './styleText.js'
import { ExecAsyncOptions, SpawnAsyncOptions } from './types.js'


/** 异步执行 `spawn` 获取字符串类型的结果 */
export const spawnAsync = (cmd: string, args: string[], options?: SpawnAsyncOptions) => {
  return new Promise<string | undefined>((resolve) => {
    const { trim, error, dryRun, ...others } = options ?? {}
    const fullCmd = stringifyArgs([ cmd, ...args ])
    
    if (dryRun) {
      console.log(`${ dim('[dry-run]') } ${ fullCmd }`)
      return resolve(undefined)
    }
    
    const child = spawn(cmd, args, { ...others })
    
    let stdout = ''
    child.stdout.setEncoding('utf-8')
    child.stdout?.on('data', (data) => stdout += (trim ? data.trim() : data))
    
    let stderr = ''
    child.stderr.setEncoding('utf-8')
    child.stderr.on('data', (data) => stderr += (trim ? data.trim() : data))
    
    child.on('close', (code) => {
      if (stderr) {
        const err = `${ red('spawnAsync') } ${ dim(fullCmd) } ${ stderr }`
        switch (error) {
          case 'log': {
            console.error(err)
            break
          }
          case 'throw': {
            throw new Error(err)
          }
        }
      }
      resolve((0 === code) ? stdout : undefined)
    })
  })
}

type ExecAsync = {
  (cmd: string, options?: ExecAsyncOptions): Promise<string | undefined>
  (cmd: string, args: string[], options?: ExecAsyncOptions): Promise<string | undefined>
}

/** 异步执行 `exec` 获取字符串类型的结果 */
export const execAsync: ExecAsync = (
  cmd: string,
  argsOrOptions?: string[] | ExecAsyncOptions,
  maybeOptions?: ExecAsyncOptions,
) => {
  return new Promise<string | undefined>((resolve) => {
    let command: string
    let options: ExecAsyncOptions | undefined
    
    if (Array.isArray(argsOrOptions)) {
      command = stringifyArgs([ cmd, ...argsOrOptions ])
      options = maybeOptions
    } else {
      command = cmd
      options = argsOrOptions
    }
    
    const { trim, dryRun, error, ...others } = options ?? {}
    
    if (dryRun) {
      console.log(`${ dim('[dry-run]') } ${ command }`)
      return resolve(undefined)
    }
    
    exec(command, { ...others }, (stderr, stdout) => {
      if (stderr) {
        const err = `${ red('execAsync') } ${ dim(command) } ${ stderr.message }`
        switch (error) {
          case 'log': {
            console.error(err)
            break
          }
          case 'throw': {
            throw new Error(err)
          }
        }
      }
      resolve(stderr ? undefined : trim ? stdout.trim() : stdout)
    })
  })
}

/** 基于 {@link spawnAsync} 实现 */
export const runGit = async (args: string[], options: SpawnAsyncOptions = { trim: true }) => {
  return spawnAsync('git', args, options)
}

/** 基于 {@link execAsync} 实现 */
export const runNpm = (args: string[], options: ExecAsyncOptions = { trim: true }) => {
  return execAsync('npm', args, options)
}

/** 基于 {@link spawnSync} 实现 */
export const runGitSync = (args: string[], options?: SpawnSyncOptionsWithStringEncoding) => {
  const { stdout } = spawnSync('git', args, { encoding: 'utf-8', ...options })
  return stdout.toString().trim()
}

/** 基于 {@link execSync} 实现 */
export const runNpmSync = (args: string[], options?: ExecSyncOptionsWithStringEncoding) => {
  const stdout = execSync(stringifyArgs([ 'npm', ...args ]), { encoding: 'utf-8', ...options })
  return stdout.toString().trim()
}

/** 将字符串以空格分割为数组 */
export const parseArgs = (args: string) =>
  args.trim() ? args.trim().split(' ') : []

/** 将数组以空格拼接为字符串 */
export const stringifyArgs = (args: string[]) =>
  args.length ? args.join(' ') : ''

/** 支持所有支持 `--version` 命令的脚本查看版本 */
export const checkVersion = async (cmd: string) => {
  return execAsync(`${ cmd } --version`)
}
