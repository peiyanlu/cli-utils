import { dim } from 'ansis'
import { exec, execSync } from 'node:child_process'
import { stringifyArgs } from '../utils.js'
import { ExecAsync, ExecAsyncOpts, ExecSync, ExecSyncOpts, getShellOptions, handleError, ShellResult } from './share.js'


export const execAsync: ExecAsync = <TFallback = undefined>(
  cmd: string,
  argsOrOptions?: string[] | ExecAsyncOpts<TFallback>,
  maybeOptions?: ExecAsyncOpts<TFallback>,
) => {
  return new Promise<ShellResult<TFallback>>((resolve, reject) => {
    let command: string
    let options: ExecAsyncOpts<TFallback> | undefined
    
    if (Array.isArray(argsOrOptions)) {
      command = stringifyArgs([ cmd, ...argsOrOptions ])
      options = maybeOptions
    } else {
      command = cmd
      options = argsOrOptions
    }
    
    const { trimEnd, dryRun, error, fallback, ...others } = options ?? {}
    
    if (dryRun) {
      console.log(`${ dim('[dry-run]') } ${ command }`)
      return resolve(fallback as ShellResult<TFallback>)
    }
    
    const shellOptions = getShellOptions()
    exec(
      command,
      { ...shellOptions, ...others, encoding: 'utf-8' },
      (err, stdout, stderr) => {
        if (err) {
          const detail = stderr.toString() || err.message
          
          try {
            const res = handleError('execAsync', command, fallback, error, detail)
            resolve(res as ShellResult<TFallback>)
          } catch (e) {
            reject(e)
          }
        }
        
        resolve(trimEnd ? stdout.trimEnd() : stdout)
      },
    )
  })
}


export const execSyncWithString: ExecSync = <TFallback = undefined>(
  cmd: string,
  argsOrOptions?: string[] | ExecSyncOpts<TFallback>,
  maybeOptions?: ExecSyncOpts<TFallback>,
) => {
  let command: string
  let options: ExecSyncOpts<TFallback> | undefined
  
  if (Array.isArray(argsOrOptions)) {
    command = stringifyArgs([ cmd, ...argsOrOptions ])
    options = maybeOptions
  } else {
    command = cmd
    options = argsOrOptions
  }
  
  const { trimEnd, dryRun, error, fallback, ...others } = options ?? {}
  
  if (dryRun) {
    console.log(`${ dim('[dry-run]') } ${ command }`)
    return fallback as ShellResult<TFallback>
  }
  
  try {
    const shellOptions = getShellOptions()
    const stdout = execSync(command, { ...shellOptions, ...others, encoding: 'utf-8' })
    
    return trimEnd ? stdout.trimEnd() : stdout
  } catch (e: any) {
    const detail = e?.stderr?.toString?.() || e?.message
    
    const res = handleError('execSyncWithString', command, fallback, error, detail)
    return res as ShellResult<TFallback>
  }
}
