import { createTempDir, GitTool, SetupManager } from '@peiyanlu/test-tools'
import { afterAll, describe, expect, it } from 'vitest'
import { gitUnstageAll, gitUnstageFile, setShellOptions } from '../../src/index.js'


const TEMP_DIR = createTempDir()
let tool: GitTool
const manager = new SetupManager()


setShellOptions({
  cwd: TEMP_DIR,
})


manager.setSetup([
  () => { // 1
    tool = new GitTool(TEMP_DIR)
    
    tool.init()
    tool.writeFileSync('a.txt', '1')
    tool.writeFileSync('b.txt', '2')
    tool.stage()
    tool.commit('feat: first commit')
  },
  () => { // 2
    tool.writeFileSync('a.txt', 'changed')
    tool.stage()
  },
  () => { // 3
    tool.writeFileSync('b.txt', 'changed')
    tool.stage()
  },
  () => { // 4
    tool.stage()
    tool.commit('feat: second commit')
  },
])

manager.setTeardown(() => {
  tool?.cleanup(true)
})

afterAll(() => {
  tool?.cleanup()
})


describe('git undo.unstage integration', () => {
  it('gitUnstageFile should remove file from index', async () => {
    await manager.prepare(2)
    
    expect(tool.stagedFiles()).not.toBe('')
    expect(tool.unstagedFiles()).toBe('')
    
    await gitUnstageFile('a.txt')
    
    expect(tool.stagedFiles()).toBe('')
    expect(tool.unstagedFiles()).not.toBe('')
  })
  
  it('gitUnstageAll should remove all staged changes', async () => {
    await manager.prepare(3)
    
    await gitUnstageAll()
    
    expect(tool.stagedFiles()).toBe('')
    expect(tool.unstagedFiles()).not.toBe('')
  })
})
