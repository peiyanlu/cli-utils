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

describe('editFile & editJsonFile & readJsonFile', () => {
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

/* ---------------------------------- */
/* parseGitHubRepo                       */
/* ---------------------------------- */

describe('parseGitHubRepo', () => {
  it('short url', () => {
    expect(utils.parseGitHubRepo('github.com:vuejs/core.git')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url', () => {
    expect(utils.parseGitHubRepo('https://github.com/vuejs/core.git')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url without .git', () => {
    expect(utils.parseGitHubRepo('https://github.com/vuejs/core')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url with tree', () => {
    expect(utils.parseGitHubRepo('https://github.com/vuejs/core/tree/main/packages')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url with hash', () => {
    expect(utils.parseGitHubRepo('https://github.com/vuejs/core#readme')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url with query', () => {
    expect(utils.parseGitHubRepo('https://github.com/vuejs/core?tab=readme-ov-file')).toEqual([ 'vuejs', 'core' ])
  })
  it('ssh url', () => {
    expect(utils.parseGitHubRepo('git@github.com:vuejs/core.git')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url without .git', () => {
    expect(utils.parseGitHubRepo('git@github.com:vuejs/core')).toEqual([ 'vuejs', 'core' ])
  })
  it('throws on invalid input', () => {
    expect(utils.parseGitHubRepo('not-a-repo')).toEqual([])
    expect(utils.parseGitHubRepo('https://google.com')).toEqual([])
  })
})

/* ---------------------------------- */
/* isTestFile                       */
/* ---------------------------------- */

describe('isTestFile', () => {
  describe('directory based', () => {
    it('matches __tests__ folder (unix)', () => {
      expect(utils.isTestFile('src/__tests__/foo.ts')).toBe(true)
    })
    
    it('matches __test__ folder (windows)', () => {
      expect(utils.isTestFile('src\\__test__\\foo.ts')).toBe(true)
    })
    
    it('matches tests folder', () => {
      expect(utils.isTestFile('packages/core/tests/utils.ts')).toBe(true)
    })
    
    it('matches test folder', () => {
      expect(utils.isTestFile('packages/core/test/index.ts')).toBe(true)
    })
    
    it('does not match contest or latest', () => {
      expect(utils.isTestFile('src/contest/foo.ts')).toBe(false)
      expect(utils.isTestFile('src/latest/foo.ts')).toBe(false)
    })
  })
  
  describe('file suffix based', () => {
    it('matches foo.test.ts', () => {
      expect(utils.isTestFile('foo.test.ts')).toBe(true)
    })
    
    it('matches foo.spec.ts', () => {
      expect(utils.isTestFile('foo.spec.ts')).toBe(true)
    })
    
    it('matches foo.unit-test.ts', () => {
      expect(utils.isTestFile('foo.unit-test.ts')).toBe(true)
    })
    
    it('matches foo.e2e-spec.js', () => {
      expect(utils.isTestFile('foo.e2e-spec.js')).toBe(true)
    })
    
    it('matches foo.test.mts', () => {
      expect(utils.isTestFile('foo.test.mts')).toBe(true)
    })
    
    it('matches foo.spec.mjs', () => {
      expect(utils.isTestFile('foo.spec.mjs')).toBe(true)
    })
    
    it('does not match foo.testcase.ts', () => {
      expect(utils.isTestFile('foo.testcase.ts')).toBe(false)
    })
    
    it('does not match foo.specimen.ts', () => {
      expect(utils.isTestFile('foo.specimen.ts')).toBe(false)
    })
  })
  
  describe('vitest special entry files', () => {
    it('matches vitest.config.ts', () => {
      expect(utils.isTestFile('vitest.config.ts')).toBe(true)
    })
    
    it('matches vitest.workspace.ts', () => {
      expect(utils.isTestFile('vitest.workspace.ts')).toBe(true)
    })
    
    it('matches vitest-setup.ts', () => {
      expect(utils.isTestFile('vitest-setup.ts')).toBe(true)
    })
    
    it('matches vitest.global.ts', () => {
      expect(utils.isTestFile('vitest.global.ts')).toBe(true)
    })
  })
  
  describe('negative cases', () => {
    it('does not match normal source files', () => {
      expect(utils.isTestFile('src/index.ts')).toBe(false)
      expect(utils.isTestFile('packages/utils/foo.ts')).toBe(false)
    })
    
    it('does not match test in middle of filename', () => {
      expect(utils.isTestFile('src/testingUtils.ts')).toBe(false)
      expect(utils.isTestFile('src/mytesthelper.ts')).toBe(false)
    })
    
    it('does not match vitest in the middle of filename', () => {
      expect(utils.isTestFile('src/myvitesthelper.ts')).toBe(false)
    })
  })
})
