import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as utils from '../src/utils.js'


const CWD = process.cwd()
const TMP_DIR = resolve(__dirname, '.tmp')

/* ---------------------------------- */
/* setup / teardown                   */
/* ---------------------------------- */

beforeEach(async () => {
  await mkdir(TMP_DIR, { recursive: true })
})

afterEach(async () => {
  if (existsSync(TMP_DIR)) {
    await utils.emptyDir(TMP_DIR)
  }
})

afterAll(async () => {
  if (existsSync(TMP_DIR)) {
    process.chdir(CWD)
    await rm(TMP_DIR, { recursive: true })
  }
})

/* ---------------------------------- */
/* string utils                       */
/* ---------------------------------- */

describe('package name utils', () => {
  it('isValidPackageName', () => {
    expect(utils.isValidPackageName('foo')).toBe(true)
    expect(utils.isValidPackageName('@scope/foo')).toBe(true)
    expect(utils.isValidPackageName('Foo Bar')).toBe(false)
  })
  
  it('toValidPackageName', () => {
    expect(utils.toValidPackageName('Foo Bar')).toBe('foo-bar')
    expect(utils.toValidPackageName('_test')).toBe('test')
  })
  
  it('toValidProjectName', () => {
    expect(utils.toValidProjectName('demo///')).toBe('demo')
  })
})

/* ---------------------------------- */
/* fs utils                           */
/* ---------------------------------- */

describe('emptyDir & isEmpty', () => {
  it('emptyDir removes files except ignored', async () => {
    await writeFile(join(TMP_DIR, 'a.txt'), 'a')
    await writeFile(join(TMP_DIR, 'b.txt'), 'b')
    
    await utils.emptyDir(TMP_DIR, [ 'b.txt' ])
    
    const files = await readdir(TMP_DIR)
    expect(files).toEqual([ 'b.txt' ])
  })
  
  it('isEmpty respects ignore', async () => {
    await writeFile(join(TMP_DIR, '.gitkeep'), '')
    expect(await utils.isEmpty(TMP_DIR, [ '.gitkeep' ])).toBe(true)
  })
})

describe('editFile & editJsonFile', () => {
  it('editFile edits text file', async () => {
    const file = join(TMP_DIR, 'a.txt')
    await writeFile(file, 'hello')
    
    await utils.editFile(file, c => c.toUpperCase())
    const content = await readFile(file, 'utf-8')
    
    expect(content).toBe('HELLO')
  })
  
  it('editJsonFile edits json safely', async () => {
    const file = join(TMP_DIR, 'a.json')
    await writeFile(file, JSON.stringify({ a: 1 }, null, 2))
    
    await utils.editJsonFile(file, json => {
      json.a = 2
    })
    
    const content = JSON.parse(await readFile(file, 'utf-8'))
    expect(content.a).toBe(2)
  })
  
  it('reads and parses json file', async () => {
    const file = join(TMP_DIR, 'data.json')
    await writeFile(file, JSON.stringify({ a: 1, b: 'x' }))
    
    const res = utils.readJsonFile<{ a: number; b: string }>(file)
    
    expect(res).toEqual({ a: 1, b: 'x' })
  })
  
  it('return {} if json is invalid', async () => {
    const file = join(TMP_DIR, 'data.json')
    await writeFile(file, '{ invalid json }')
    
    expect(utils.readJsonFile(file)).toEqual({})
  })
  
  it('return {} if file does not exist', () => {
    const notExist = join(TMP_DIR, '404.json')
    
    expect(utils.readJsonFile(notExist)).toEqual({})
  })
})

/* ---------------------------------- */
/* copyDirAsync                       */
/* ---------------------------------- */

describe('copyDirAsync', () => {
  it('copies directory with rename & skip rules', async () => {
    const src = join(TMP_DIR, 'src')
    const dest = join(TMP_DIR, 'dest')
    
    await mkdir(join(src, 'sub'), { recursive: true })
    await writeFile(join(src, 'a.txt'), 'a')
    await writeFile(join(src, '_gitignore'), 'git')
    
    await utils.copyDirAsync(src, dest, {
      rename: {
        _gitignore: '.gitignore',
      },
      skips: [
        (name) => name === 'a.txt',
      ],
    })
    
    const files = await readdir(dest)
    expect(files).toContain('.gitignore')
    expect(files).not.toContain('a.txt')
  })
})
