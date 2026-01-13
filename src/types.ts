import { ExecOptions, SpawnOptions } from 'child_process'


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
  trim?: boolean
  dryRun?: boolean
  error?: 'log' | 'throw' | 'ignore'
}

export type SpawnAsyncOptions<T = SpawnOptions> = T & ExecResultOptions

export type ExecAsyncOptions<T = ExecOptions> = T & ExecResultOptions
