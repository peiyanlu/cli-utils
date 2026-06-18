import { dim } from 'ansis'
import { spawn, spawnSync } from 'node:child_process'
import { stringifyArgs } from '../utils.js'
import { getShellOptions, handleError, ShellResult, SpawnAsyncOpts, SpawnSyncOpts } from './share.js'


/** 异步执行 `spawn` 获取字符串类型的结果 */
export const spawnAsync = <TFallback = undefined>(
  cmd: string,
  args: string[],
  options?: SpawnAsyncOpts<TFallback>,
) => {
  return new Promise<ShellResult<TFallback>>((resolve, reject) => {
    const { trimEnd, error, dryRun, fallback, ...others } = options ?? {}
    const fullCmd = stringifyArgs([ cmd, ...args ])
    
    if (dryRun) {
      console.log(`${ dim('[dry-run]') } ${ fullCmd }`)
      return resolve(fallback as ShellResult<TFallback>)
    }
    
    const shellOptions = getShellOptions()
    const child = spawn(cmd, args, { ...shellOptions, ...others })
    
    let stdout = ''
    child.stdout?.setEncoding('utf-8')
    child.stdout?.on('data', (d) => {
      stdout += trimEnd ? d.trimEnd() : d
    })
    
    let stderr = ''
    child.stderr?.setEncoding('utf-8')
    child.stderr?.on('data', (d) => {
      stderr += trimEnd ? d.trimEnd() : d
    })
    
    
    const handler = (err: string) => {
      try {
        const res = handleError<TFallback>('SA', fullCmd, fallback, error, err)
        resolve(res as ShellResult<TFallback>)
      } catch (e) {
        reject(e)
      }
    }
    
    child.on('error', (sysErr) => handler(sysErr.message)) // 系统级错误（ENOENT）
    
    child.on('close', (code) => {
      if (code !== 0) {
        handler(stderr)
      }
      
      resolve(stdout)
    })
  })
}


/** 执行 `spawnSync` 获取字符串类型的结果 */
export const spawnSyncWithString = <TFallback = undefined>(
  cmd: string,
  args: string[],
  options?: SpawnSyncOpts<TFallback>,
) => {
  const { trimEnd, error, dryRun, fallback, ...others } = options ?? {}
  const fullCmd = stringifyArgs([ cmd, ...args ])
  
  if (dryRun) {
    console.log(`${ dim('[dry-run]') } ${ fullCmd }`)
    return fallback as ShellResult<TFallback>
  }
  
  const shellOptions = getShellOptions()
  const { stdout, stderr, status, error: sysErr } = spawnSync(
    cmd,
    args,
    {
      ...shellOptions,
      ...others,
      encoding: 'utf-8',
    },
  )
  
  if (status !== 0) {
    const detail = sysErr?.message || stderr?.toString()
    const res = handleError<TFallback>('SSWS', fullCmd, fallback, error, detail)
    
    return res as ShellResult<TFallback>
  }
  
  return trimEnd ? stdout.trimEnd() : stdout
}
