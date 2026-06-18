import { dim, red } from 'ansis'
import { ExecOptions, ExecSyncOptions, SpawnOptions, SpawnSyncOptions } from 'node:child_process'
import { eol } from '../utils.js'


export interface ShellOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeout?: number
}

export type ShellResult<T> =
  [ T ] extends [ never ]
    ? string | undefined
    : string | T


export interface ShellResultOptions {
  /** 去掉结果的末尾空格 */
  trimEnd?: boolean
  
  /** 仅打印命令，不实际执行命令 */
  dryRun?: boolean
  
  /** log: 打印错误信息，返回 undefined; throw: 抛出错误; 未定义: 返回 undefined */
  error?: 'log' | 'throw'
}


export type SpawnAsyncWithStringOptions = SpawnOptions & ShellResultOptions

export type SpawnSyncWithStringOptions = Omit<SpawnSyncOptions, 'encoding'> & ShellResultOptions

export type ExecAsyncWithStringOptions = Omit<ExecOptions, 'encoding'> & ShellResultOptions

export type ExecSyncWithStringOptions = Omit<ExecSyncOptions, 'encoding'> & ShellResultOptions

export type ShellOpts<O, T = never> =
  | (O & { fallback: T })
  | (O & { fallback?: never })

export type SpawnAsyncOpts<T = never> = ShellOpts<SpawnAsyncWithStringOptions, T>
export type SpawnSyncOpts<T = never> = ShellOpts<SpawnSyncWithStringOptions, T>

export type ExecAsyncOpts<T = never> = ShellOpts<ExecAsyncWithStringOptions, T>
export type ExecSyncOpts<T = never> = ShellOpts<ExecSyncWithStringOptions, T>

export type ExecAsync = {
  <TFallback = undefined>(cmd: string, options?: ExecAsyncOpts<TFallback>): Promise<ShellResult<TFallback>>
  <TFallback = undefined>(cmd: string, args: string[], options?: ExecAsyncOpts<TFallback>): Promise<ShellResult<TFallback>>
}

export type ExecSync = {
  <TFallback = undefined>(cmd: string, options?: ExecSyncOpts<TFallback>): ShellResult<TFallback>
  <TFallback = undefined>(cmd: string, args: string[], options?: ExecAsyncOpts<TFallback>): ShellResult<TFallback>
}


const formatErr = (caller: string, cmd: string, err: string) => {
  return `${ red(caller) } ${ dim(cmd) }${ eol() }${ err }`
}


export const handleError = <T>(
  prefix: string,
  fullCmd: string,
  fallback: string | T | undefined,
  error: string | undefined,
  stderr: string,
) => {
  const msg = formatErr(`[${ prefix }]`, fullCmd, stderr)
  switch (error) {
    case 'log': {
      console.error(msg)
      return fallback
    }
    case 'throw':
      throw new Error(msg)
    default:
      return fallback
  }
}


const shellOptions: ShellOptions = {}

export const setShellOptions = (options: ShellOptions) => {
  Object.assign(shellOptions, options)
}

export const getShellOptions = () => {
  return Object.freeze({ ...shellOptions })
}
