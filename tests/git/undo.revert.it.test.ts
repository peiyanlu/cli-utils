import { createTempDir, GitTool, SetupManager } from '@peiyanlu/test-tools'
import { afterAll, describe, expect, it } from 'vitest'
import { gitRevertCommit, shell } from '../../src/index.js'


const TEMP_DIR = createTempDir()
let testTools: GitTool
const manager = new SetupManager()


shell.configure({
  cwd: TEMP_DIR,
})


manager.setSetup([
  () => { // 1
    testTools = new GitTool(TEMP_DIR)
    
    testTools.init()
    testTools.writeFileSync('a.txt', '1')
    testTools.stage()
    testTools.commit('feat: first commit')
  },
  () => { // 2
    testTools.writeFileSync('b.txt', '2')
    testTools.stage()
    testTools.commit('feat: second commit')
  },
])

manager.setTeardown(() => {
  testTools?.cleanup(true)
})

afterAll(() => {
  testTools?.cleanup()
})


describe('git undo.revert integration', () => {
  it('gitRevertCommit should create revert commit', async () => {
    await manager.prepare(2)
    
    const head = testTools.exec('git rev-parse HEAD')
    await gitRevertCommit(head.trim())
    
    expect(testTools.exec('git rev-list --count HEAD').trim())
      .toBe('3')
    
    expect(testTools.exec('git log -1 --pretty=%s'))
      .toContain('Revert')
  })
})
