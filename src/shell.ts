import { ExecOptions, SpawnOptions } from 'child_process'
import { exec, spawn } from 'node:child_process'
import { styleText } from 'node:util'
import { ExecAsyncOptions, SpawnAsyncOptions } from './types.js'


export const dim = (text: string) => styleText([ 'dim' ], text)
export const red = (text: string) => styleText([ 'red' ], text)
export const yellow = (text: string) => styleText([ 'yellow' ], text)
export const underline = (text: string) => styleText([ 'underline' ], text)


export const spawnAsync = <T = SpawnOptions>(cmd: string, args: string[], options?: SpawnAsyncOptions<T>) => {
  return new Promise<string | undefined>((resolve) => {
    const { trim, error, dryRun, ...others } = options ?? {}
    const fullCmd = [ cmd, ...args ].join(' ')
    
    if (dryRun) {
      console.log(`${ dim('[dry-run]') } ${ fullCmd }`)
      return resolve(undefined)
    }
    
    const child = spawn(cmd, args, { ...others })
    
    let stdout = ''
    child.stdout?.setEncoding('utf-8')
    child.stdout?.on('data', (data) => stdout += (trim ? data.trim() : data))
    
    let stderr = ''
    child.stderr?.setEncoding('utf-8')
    child.stderr?.on('data', (data) => stderr += (trim ? data.trim() : data))
    
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

export const execAsync = <T = ExecOptions>(cmd: string, options?: ExecAsyncOptions<T>) => {
  return new Promise<string | undefined>((resolve) => {
    const { trim, dryRun, error, ...others } = options ?? {}
    
    if (dryRun) {
      console.log(`${ dim('[dry-run]') } ${ cmd }`)
      return resolve(undefined)
    }
    
    exec(cmd, { ...others }, (err, stdout) => {
      if (err) {
        const msg = `${ red('execAsync') } ${ dim(cmd) } ${ err.message }`
        switch (error) {
          case 'log': {
            console.error(msg)
            break
          }
          case 'throw': {
            throw new Error(msg)
          }
        }
      }
      resolve(err ? undefined : trim ? stdout.trim() : stdout)
    })
  })
}


export const runGit = async (args: string[], options: SpawnAsyncOptions = { trim: true }) => {
  return spawnAsync('git', args, options)
}

export const runNpm = (args: string[], options: ExecAsyncOptions = { trim: true }) => {
  return execAsync([ 'npm', ...args ].join(' '), options)
}


export const fixArgs = (args: string) => (args.trim() ? args.trim().split(' ') : [])

export const checkVersion = async (cmd: string) => {
  return execAsync(`${ cmd } --version`)
}
