import { ExecOptionsWithStringEncoding, SpawnOptionsWithoutStdio } from 'node:child_process'


export interface CopyOptions {
  rename?: Record<string, string>
  skips?: ((name: string, isDir: boolean) => boolean)[]
}

export type CliOptions<T = string | boolean> = Record<string, T>

export interface PkgInfo {
  name: string
  version: string
}

export interface ExecResultOptions {
  /** 去掉结果的首尾空格 */
  trim?: boolean
  /** 仅打印命令，不实际执行命令 */
  dryRun?: boolean
  /** log: 打印错误信息，返回 undefined; throw: 抛出错误; ignore: 返回 undefined */
  error?: 'log' | 'throw' | 'ignore'
}

export type SpawnAsyncOptions = SpawnOptionsWithoutStdio & ExecResultOptions

export type ExecAsyncOptions = ExecOptionsWithStringEncoding & ExecResultOptions
