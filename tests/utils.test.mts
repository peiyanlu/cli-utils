import { createTempDir } from '@peiyanlu/test-tools'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  copyDirAsync,
  editFile,
  editJsonFile,
  emptyDir,
  eol,
  getGithubReleaseUrl,
  getGithubUrl,
  getPackageInfo,
  getPackageUrl,
  isEmpty,
  isTestFile,
  isValidPackageName,
  parseArgs,
  parseGitHubRepo,
  pkgFromUserAgent,
  readJsonFile,
  readSubDirs,
  space,
  splitLines,
  stringifyArgs,
  toValidPackageName,
  toValidProjectName,
  trimTemplate,
} from '../src/index.js'


const TEMP_DIR = createTempDir()


beforeEach(async () => {
  await emptyDir(TEMP_DIR)
})

afterAll(async () => {
  await rm(TEMP_DIR, { recursive: true })
})


describe('package name utils', () => {
  it('isValidPackageName', () => {
    expect(isValidPackageName('foo')).toBe(true)
    expect(isValidPackageName('@scope/foo')).toBe(true)
    expect(isValidPackageName('Foo Bar')).toBe(false)
  })
  
  it('toValidPackageName', () => {
    expect(toValidPackageName('Foo Bar')).toBe('foo-bar')
    expect(toValidPackageName('_test')).toBe('test')
  })
  
  it('toValidProjectName', () => {
    expect(toValidProjectName('demo///')).toBe('demo')
  })
})

describe('emptyDir & isEmpty', () => {
  it('emptyDir returns false when directory does not exist', async () => {
    expect(await emptyDir(join(TEMP_DIR, 'not-exist'))).toBe(false)
  })
  
  it('emptyDir removes files except ignored', async () => {
    await writeFile(join(TEMP_DIR, 'a.txt'), 'a')
    await writeFile(join(TEMP_DIR, 'b.txt'), 'b')
    
    await emptyDir(TEMP_DIR, [ 'b.txt' ])
    
    const files = await readdir(TEMP_DIR)
    expect(files).toEqual([ 'b.txt' ])
  })
  
  it('isEmpty respects ignore', async () => {
    await writeFile(join(TEMP_DIR, '.gitkeep'), '')
    expect(await isEmpty(TEMP_DIR, [ '.gitkeep' ])).toBe(true)
  })
  
  it('isEmpty returns false when non-ignored files exist', async () => {
    await writeFile(join(TEMP_DIR, '.gitkeep'), '')
    await writeFile(join(TEMP_DIR, 'a.txt'), 'a')
    
    expect(await isEmpty(TEMP_DIR, [ '.gitkeep' ])).toBe(false)
  })
})

describe('editFile & editJsonFile & readJsonFile', () => {
  it('editFile skips missing file', async () => {
    const file = join(TEMP_DIR, 'missing.txt')
    
    await editFile(file, () => 'created')
    
    expect(existsSync(file)).toBe(false)
  })
  
  it('editFile edits text file', async () => {
    const file = join(TEMP_DIR, 'a.txt')
    await writeFile(file, 'hello')
    
    await editFile(file, c => c.toUpperCase())
    const content = await readFile(file, 'utf-8')
    
    expect(content).toBe('HELLO')
  })
  
  it('editJsonFile edits json safely', async () => {
    const file = join(TEMP_DIR, 'a.json')
    await writeFile(file, JSON.stringify({ a: 1 }, null, 2))
    
    await editJsonFile(file, json => {
      json.a = 2
    })
    
    const content = JSON.parse(await readFile(file, 'utf-8'))
    expect(content.a).toBe(2)
  })
  
  it('editJsonFile keeps invalid json unchanged', async () => {
    const file = join(TEMP_DIR, 'invalid.json')
    const content = '{ invalid json }'
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    await writeFile(file, content)
    await editJsonFile(file, json => {
      json.a = 2
    })
    
    expect(await readFile(file, 'utf-8')).toBe(content)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
  
  it('reads and parses json file', async () => {
    const file = join(TEMP_DIR, 'data.json')
    await writeFile(file, JSON.stringify({ a: 1, b: 'x' }))
    
    const res = readJsonFile<{ a: number; b: string }>(file)
    
    expect(res).toEqual({ a: 1, b: 'x' })
  })
  
  it('return {} if json is invalid', async () => {
    const file = join(TEMP_DIR, 'data.json')
    await writeFile(file, '{ invalid json }')
    
    expect(readJsonFile(file)).toEqual({})
  })
  
  it('return {} if file does not exist', () => {
    const notExist = join(TEMP_DIR, '404.json')
    
    expect(readJsonFile(notExist)).toEqual({})
  })
})

describe('readSubDirs', () => {
  it('returns sub directories except ignored names', async () => {
    await mkdir(join(TEMP_DIR, 'packages'), { recursive: true })
    await mkdir(join(TEMP_DIR, 'node_modules'), { recursive: true })
    await writeFile(join(TEMP_DIR, 'package.json'), '{}')
    
    expect(await readSubDirs(TEMP_DIR, [ 'node_modules' ])).toEqual([ 'packages' ])
  })
})

describe('copyDirAsync', () => {
  it('copies directory with rename & skip rules', async () => {
    const src = join(TEMP_DIR, 'src')
    const dest = join(TEMP_DIR, 'dest')
    
    await mkdir(join(src, 'sub'), { recursive: true })
    await writeFile(join(src, 'a.txt'), 'a')
    await writeFile(join(src, '_gitignore'), 'git')
    
    await copyDirAsync(src, dest, {
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
  
  it('copies nested directories and can skip directories', async () => {
    const src = join(TEMP_DIR, 'src')
    const dest = join(TEMP_DIR, 'dest')
    
    await mkdir(join(src, 'sub'), { recursive: true })
    await mkdir(join(src, 'ignored'), { recursive: true })
    await writeFile(join(src, 'sub', 'a.txt'), 'a')
    await writeFile(join(src, 'ignored', 'b.txt'), 'b')
    
    await copyDirAsync(src, dest, {
      skips: [
        (name, isDir) => isDir && name === 'ignored',
      ],
    })
    
    expect(await readFile(join(dest, 'sub', 'a.txt'), 'utf-8')).toBe('a')
    expect(existsSync(join(dest, 'ignored'))).toBe(false)
  })
})

describe('package info utils', () => {
  it('getPackageInfo reads package metadata and resolved paths', async () => {
    const pkgDir = join(TEMP_DIR, 'pkg')
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'package.json'), JSON.stringify({
      name: '@scope/pkg',
      version: '1.2.3',
      private: true,
    }))
    
    expect(getPackageInfo('@scope/pkg', () => pkgDir)).toMatchObject({
      pkg: {
        name: '@scope/pkg',
        version: '1.2.3',
        private: true,
      },
      pkgDir,
      pkgPath: join(pkgDir, 'package.json'),
    })
  })
  
  it('pkgFromUserAgent parses package manager name and version', () => {
    expect(pkgFromUserAgent('pnpm/10.0.0 npm/? node/v24')).toEqual({
      name: 'pnpm',
      version: '10.0.0',
    })
  })
  
  it('pkgFromUserAgent returns undefined for empty user agent', () => {
    expect(pkgFromUserAgent(undefined)).toBeUndefined()
  })
})

describe('parseGitHubRepo', () => {
  it('short url', () => {
    expect(parseGitHubRepo('github.com:vuejs/core.git')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url', () => {
    expect(parseGitHubRepo('https://github.com/vuejs/core.git')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url without .git', () => {
    expect(parseGitHubRepo('https://github.com/vuejs/core')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url with tree', () => {
    expect(parseGitHubRepo('https://github.com/vuejs/core/tree/main/packages')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url with hash', () => {
    expect(parseGitHubRepo('https://github.com/vuejs/core#readme')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url with query', () => {
    expect(parseGitHubRepo('https://github.com/vuejs/core?tab=readme-ov-file')).toEqual([ 'vuejs', 'core' ])
  })
  it('ssh url', () => {
    expect(parseGitHubRepo('git@github.com:vuejs/core.git')).toEqual([ 'vuejs', 'core' ])
  })
  it('https url without .git', () => {
    expect(parseGitHubRepo('git@github.com:vuejs/core')).toEqual([ 'vuejs', 'core' ])
  })
  it('throws on invalid input', () => {
    expect(parseGitHubRepo('not-a-repo')).toEqual([])
    expect(parseGitHubRepo('https://google.com')).toEqual([])
  })
})

describe('isTestFile', () => {
  describe('directory based', () => {
    it('matches __tests__ folder (unix)', () => {
      expect(isTestFile('src/__tests__/foo.ts')).toBe(true)
    })
    
    it('matches __test__ folder (windows)', () => {
      expect(isTestFile('src\\__test__\\foo.ts')).toBe(true)
    })
    
    it('matches tests folder', () => {
      expect(isTestFile('packages/core/tests/ts')).toBe(true)
    })
    
    it('matches test folder', () => {
      expect(isTestFile('packages/core/test/index.ts')).toBe(true)
    })
    
    it('does not match contest or latest', () => {
      expect(isTestFile('src/contest/foo.ts')).toBe(false)
      expect(isTestFile('src/latest/foo.ts')).toBe(false)
    })
  })
  
  describe('file suffix based', () => {
    it('matches foo.test.ts', () => {
      expect(isTestFile('foo.test.ts')).toBe(true)
    })
    
    it('matches foo.spec.ts', () => {
      expect(isTestFile('foo.spec.ts')).toBe(true)
    })
    
    it('matches foo.unit-test.ts', () => {
      expect(isTestFile('foo.unit-test.ts')).toBe(true)
    })
    
    it('matches foo.e2e-spec.js', () => {
      expect(isTestFile('foo.e2e-spec.js')).toBe(true)
    })
    
    it('matches foo.test.mts', () => {
      expect(isTestFile('foo.test.mts')).toBe(true)
    })
    
    it('matches foo.spec.mjs', () => {
      expect(isTestFile('foo.spec.mjs')).toBe(true)
    })
    
    it('does not match foo.testcase.ts', () => {
      expect(isTestFile('foo.testcase.ts')).toBe(false)
    })
    
    it('does not match foo.specimen.ts', () => {
      expect(isTestFile('foo.specimen.ts')).toBe(false)
    })
  })
  
  describe('vitest special entry files', () => {
    it('matches vitest.config.ts', () => {
      expect(isTestFile('vitest.config.ts')).toBe(true)
    })
    
    it('matches vitest.workspace.ts', () => {
      expect(isTestFile('vitest.workspace.ts')).toBe(true)
    })
    
    it('matches vitest-setup.ts', () => {
      expect(isTestFile('vitest-setup.ts')).toBe(true)
    })
    
    it('matches vitest.global.ts', () => {
      expect(isTestFile('vitest.global.ts')).toBe(true)
    })
  })
  
  describe('negative cases', () => {
    it('does not match normal source files', () => {
      expect(isTestFile('src/index.ts')).toBe(false)
      expect(isTestFile('packages/utils/foo.ts')).toBe(false)
    })
    
    it('does not match test in middle of filename', () => {
      expect(isTestFile('src/testingUtils.ts')).toBe(false)
      expect(isTestFile('src/mytesthelper.ts')).toBe(false)
    })
    
    it('does not match vitest in the middle of filename', () => {
      expect(isTestFile('src/myvitesthelper.ts')).toBe(false)
    })
  })
})

describe('string helpers', () => {
  it('eol repeats OS line endings', () => {
    expect(eol(2)).toBe(eol() + eol())
  })
  
  it('space repeats spaces', () => {
    expect(space()).toBe(' ')
    expect(space(3)).toBe('   ')
  })
  
  it('parseArgs splits by spaces after trimming', () => {
    expect(parseArgs('  a b  c  ')).toEqual([ 'a', 'b', '', 'c' ])
    expect(parseArgs('   ')).toEqual([])
  })
  
  it('stringifyArgs joins args with spaces', () => {
    expect(stringifyArgs([ 'a', 'b' ])).toBe('a b')
    expect(stringifyArgs([])).toBe('')
  })
  
  it('trimTemplate removes leading and trailing blank lines', () => {
    expect(trimTemplate(`
      hello
    `)).toBe('      hello')
  })
  
  it('splitLines supports lf and crlf and removes empty lines', () => {
    expect(splitLines('a\n\nb\r\nc\n')).toEqual([ 'a', 'b', 'c' ])
  })
})

describe('url helpers', () => {
  it('getGithubUrl builds repository url', () => {
    expect(getGithubUrl('vuejs', 'core')).toBe('https://github.com/vuejs/core')
  })
  
  it('getGithubReleaseUrl encodes tag in release url', () => {
    expect(getGithubReleaseUrl('vuejs', 'core', 'v1.0.0 beta')).toBe(
      'https://github.com/vuejs/core/releases/tag/v1.0.0%20beta')
  })
  
  it('getPackageUrl builds npm package version url', () => {
    expect(getPackageUrl('@scope/pkg', '1.0.0')).toBe('https://www.npmjs.com/package/@scope/pkg/v/1.0.0')
  })
})
