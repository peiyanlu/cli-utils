import { exec, execSync, spawn, spawnSync } from 'node:child_process'
import { dim, red } from './styleText.js'
import type {
  ExecAsyncWithStringOptions,
  ExecSyncWithStringOptions,
  SpawnAsyncWithStringOptions,
  SpawnSyncWithStringOptions,
} from './types.js'
import { eol, stringifyArgs } from './utils.js'


const formatErr = (caller: string, cmd: string, err: string) => {
  return `${ red(caller) } ${ dim(cmd) }${ eol() }${ err }`
}

/** 异步执行 `spawn` 获取字符串类型的结果 */
export const spawnAsync = (cmd: string, args: string[], options?: SpawnAsyncWithStringOptions) => {
  return new Promise<string | undefined>((resolve, reject) => {
    const { trim, error, dryRun, ...others } = options ?? {}
    const fullCmd = stringifyArgs([ cmd, ...args ])
    
    if (dryRun) {
      console.log(`${ dim('[dry-run]') } ${ fullCmd }`)
      return resolve(undefined)
    }
    
    const child = spawn(cmd, args, { ...others })
    
    let stdout = ''
    child.stdout?.setEncoding('utf-8')
    child.stdout?.on('data', (d) => {
      stdout += trim ? d.trim() : d
    })
    
    let stderr = ''
    child.stderr?.setEncoding('utf-8')
    child.stderr?.on('data', (d) => {
      stderr += trim ? d.trim() : d
    })
    
    child.on('error', reject) // 系统级错误（ENOENT）
    
    child.on('close', (code) => {
      if (code !== 0) {
        const msg = formatErr('spawnAsync', fullCmd, stderr)
        
        if (error === 'log') {
          console.error(msg)
          return resolve(undefined)
        }
        
        if (error === 'throw') {
          return reject(new Error(msg))
        }
        
        return resolve(undefined)
      }
      
      resolve(stdout)
    })
  })
}

type ExecAsync = {
  (cmd: string, options?: ExecAsyncWithStringOptions): Promise<string | undefined>
  (cmd: string, args: string[], options?: ExecAsyncWithStringOptions): Promise<string | undefined>
}

/** 异步执行 `exec` 获取字符串类型的结果 */
export const execAsync: ExecAsync = (
  cmd: string,
  argsOrOptions?: string[] | ExecAsyncWithStringOptions,
  maybeOptions?: ExecAsyncWithStringOptions,
) => {
  return new Promise<string | undefined>((resolve, reject) => {
    let command: string
    let options: ExecAsyncWithStringOptions | undefined
    
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
    
    exec(command, { ...others }, (err, stdout, stderr) => {
      if (err) {
        const detail =
          stderr?.toString?.() ||
          err?.message ||
          ''
        
        const msg = formatErr('execAsync', command, detail)
        
        if (error === 'log') {
          console.error(msg)
          return resolve(undefined)
        }
        
        if (error === 'throw') {
          return reject(new Error(msg))
        }
        
        return resolve(undefined)
      }
      
      resolve(trim ? stdout.trim() : stdout)
    })
  })
}

/** 执行 `spawnSync` 获取字符串类型的结果 */
export const spawnSyncWithString = (cmd: string, args: string[], options?: SpawnSyncWithStringOptions) => {
  const { trim, error, dryRun, ...others } = options ?? {}
  const fullCmd = stringifyArgs([ cmd, ...args ])
  
  if (dryRun) {
    console.log(`${ dim('[dry-run]') } ${ fullCmd }`)
    return undefined
  }
  
  const { stdout, stderr, status, error: err } = spawnSync(cmd, args, { encoding: 'utf-8', ...others })
  
  if (status !== 0 || err) {
    const detail =
      err?.message ||
      stderr?.toString?.() ||
      ''
    
    const msg = formatErr('spawnSync', fullCmd, detail)
    
    if (error === 'log') {
      console.error(msg)
      return undefined
    }
    
    if (error === 'throw') {
      throw new Error(msg)
    }
    
    return undefined
  }
  
  return trim ? stdout.trim() : stdout
}


type ExecSync = {
  (cmd: string, options?: ExecAsyncWithStringOptions): string | undefined
  (cmd: string, args: string[], options?: ExecAsyncWithStringOptions): string | undefined
}


/** 执行 `execSync` 获取字符串类型的结果 */
export const execSyncWithString: ExecSync = (
  cmd: string,
  argsOrOptions?: string[] | ExecSyncWithStringOptions,
  maybeOptions?: ExecSyncWithStringOptions,
) => {
  let command: string
  let options: ExecAsyncWithStringOptions | undefined
  
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
    return undefined
  }
  
  try {
    const stdout = execSync(command, { encoding: 'utf-8', ...others })
    return trim ? stdout.trim() : stdout
  } catch (e: any) {
    const stderr =
      e?.stderr?.toString?.() ||
      e?.message ||
      ''
    
    const msg = formatErr('execSync', command, stderr)
    
    if (error === 'log') {
      console.error(msg)
      return undefined
    }
    
    if (error === 'throw') {
      throw new Error(msg)
    }
    
    return undefined
  }
}


/** 基于 {@link spawnAsync} 实现 */
export const runGit = async (args: string[], options: SpawnAsyncWithStringOptions = { trim: true }) => {
  return spawnAsync('git', args, options)
}

/** 基于 {@link spawnSyncWithString} 实现 */
export const runGitSync = (args: string[], options?: SpawnSyncWithStringOptions) => {
  return spawnSyncWithString('git', args, { ...options })
}

/** 基于 {@link execAsync} 实现 */
export const runNpm = (args: string[], options: ExecAsyncWithStringOptions = { trim: true }) => {
  return execAsync('npm', args, options)
}

/** 基于 {@link execSyncWithString} 实现 */
export const runNpmSync = (args: string[], options?: ExecSyncWithStringOptions) => {
  return execSyncWithString('npm', args, { ...options })
}

/** 基于 {@link spawnAsync} 实现 */
export const runNode = (args: string[], options: SpawnAsyncWithStringOptions) => {
  return spawnAsync('node', args, options)
}

/** 基于 {@link spawnSyncWithString} 实现 */
export const runNodeSync = (args: string[], options: SpawnSyncWithStringOptions) => {
  return spawnSyncWithString('node', args, options)
}

/** 支持所有支持 `--version` 命令的脚本查看版本 */
export const checkVersion = async (cmd: string) => {
  return execAsync(`${ cmd } --version`)
}
