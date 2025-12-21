export interface CopyOptions {
  rename?: Record<string, string>
  skips?: ((name: string, isDir: boolean) => boolean)[]
}

export type CliOptions<T = string | boolean> = Record<string, T>

export interface PkgInfo {
  name: string
  version: string
}
