import { createTempDir, GitTool, SetupManager } from '@peiyanlu/test-tools'
import { afterAll, describe, expect, it } from 'vitest'
import { gitDiscardAll, gitDiscardFile, setShellOptions } from '../../src/index.js'


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
    tool.writeFileSync('b.txt', 'changed')
  },
])

manager.setTeardown(() => {
  tool?.cleanup(true)
})

afterAll(() => {
  tool?.cleanup()
})


describe('git undo.discard integration', () => {
  it('gitDiscardFile should discard file staged and unstaged changes', async () => {
    await manager.prepare(2)
    
    await gitDiscardFile('a.txt')
    await gitDiscardFile('b.txt')
    
    expect(tool.exec('git status --short')).toBe('')
    expect(tool.readFileSync('a.txt', 'utf-8')).toBe('1')
  })
  
  it('gitDiscardAll should discard all changes', async () => {
    await manager.prepare(2)
    
    await gitDiscardAll()
    
    expect(tool.exec('git status --short')).toBe('')
  })
})
