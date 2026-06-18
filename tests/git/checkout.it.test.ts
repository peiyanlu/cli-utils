import { createTempDir, GitTool, SetupManager } from '@peiyanlu/test-tools'
import { afterAll, describe, expect, it } from 'vitest'
import {
  gitBranchCurrent,
  gitCheckoutBranch,
  gitCheckoutBranchForce,
  gitCheckoutBranchOrphan,
  setShellOptions,
} from '../../src/index.js'


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
    tool.writeFileSync('./package.json', '{"version": "1.0.0"}')
    tool.stage()
    tool.commit('feat: first commit')
  },
  () => { // 2 feature
    tool.exec('git checkout master')
    tool.exec('git checkout -b feature')
    tool.writeFileSync('./a.txt', 'hello')
    tool.stage()
    tool.commit('feat(feature): add a.txt')
    tool.exec('git checkout master')
  },
  () => { // 3
    tool.exec('git checkout master')
    tool.writeFileSync('./b.txt', 'world')
    tool.stage()
    tool.commit('feat: second commit')
    tool.exec('git tag v1.0.0')
  },
  () => { // 4 feature2
    tool.exec('git checkout master')
    tool.exec('git checkout -b feature2')
    tool.writeFileSync('./a.txt', 'hello')
    tool.stage()
    tool.commit('feat(feature2): add a.txt')
    tool.exec('git checkout master')
  },
  () => { // 5
    tool.exec('git checkout master')
    tool.writeFileSync('./c.txt', '!')
    tool.stage()
    tool.commit('feat: third commit')
  },
  () => { // 6
    tool.commit('feat: fourth commit')
  },
])

manager.setTeardown(() => {
  tool?.cleanup(true)
})

afterAll(() => {
  tool?.cleanup()
})


describe('git checkout integration', () => {
  it('checkoutBranch should create and switch to new branch', async () => {
    await manager.prepare(1)
    
    const branch: string = 'checkou-b-branch'
    await gitCheckoutBranch(branch)
    expect(await gitBranchCurrent()).toBe(branch)
  })
  
  it('checkoutBranch should switch to existing branch when creation fails', async () => {
    await manager.prepare(2)
    
    const branch: string = 'feature'
    
    tool.exec(`git checkout ${ branch }`)
    const featureHead = tool.exec('git rev-parse HEAD')
    tool.exec('git checkout master')
    const masterHead = tool.exec(`git rev-parse HEAD`)
    
    await gitCheckoutBranch(branch)
    expect(await gitBranchCurrent()).toBe(branch)
    
    const currentHead = tool.exec(`git rev-parse HEAD`)
    expect(currentHead).toBe(featureHead)
    expect(currentHead).not.toBe(masterHead)
  })
  
  it('checkoutBranch should create branch from specified startpoint', async () => {
    await manager.prepare(3)
    
    const branch: string = 'checkout-b-branch-startpoint'
    const startpoint: string = 'v1.0.0'
    await gitCheckoutBranch(branch, startpoint)
    expect(await gitBranchCurrent()).toBe(branch)
    expect(tool.exec('git rev-parse HEAD'))
      .toBe(tool.exec(`git rev-parse ${ startpoint }`))
  })
  
  it('checkoutBranchForce should create and switch to new branch', async () => {
    await manager.prepare(2)
    
    await gitCheckoutBranchForce('feature')
    expect(await gitBranchCurrent()).toBe('feature')
  })
  
  it('checkoutBranchForce should reset existing branch to current HEAD', async () => {
    await manager.prepare(5)
    
    const branch: string = 'feature2'
    
    tool.exec(`git checkout ${ branch }`)
    const featureHead = tool.exec('git rev-parse HEAD')
    tool.exec('git checkout master')
    const masterHead = tool.exec(`git rev-parse HEAD`)
    
    await gitCheckoutBranchForce(branch)
    expect(await gitBranchCurrent()).toBe(branch)
    
    const currentHead = tool.exec(`git rev-parse HEAD`)
    expect(currentHead).toBe(masterHead)
    expect(currentHead).not.toBe(featureHead)
  })
  
  it('checkoutBranchForce should create branch from specified startpoint', async () => {
    await manager.prepare(3)
    
    const branch: string = 'checkout-B-branch-startpoint'
    const startpoint: string = 'v1.0.0'
    await gitCheckoutBranchForce(branch, startpoint)
    expect(await gitBranchCurrent()).toBe(branch)
    expect(tool.exec('git rev-parse HEAD'))
      .toBe(tool.exec(`git rev-parse ${ startpoint }`))
  })
  
  it('gitCheckoutBranchOrphan should create an orphan branch', async () => {
    await manager.prepare(1)
    
    await gitCheckoutBranchOrphan('branch-orphan')
    
    expect(await gitBranchCurrent()).toBe('branch-orphan')
    expect(() => {tool.exec('git rev-parse branch-orphan')}).toThrow()
    
    const status = tool.exec('git status --short')
    expect(status).not.toBe('')
    status
      .split('\n')
      .filter(Boolean)
      .forEach(line => {
        expect(line.startsWith('A ')).toBe(true)
      })
  })
  
  it('gitCheckoutBranchOrphan should create branch from specified startpoint', async () => {
    await manager.prepare(3)
    
    const branch: string = 'checkout-orphan-branch-startpoint'
    const startpoint: string = 'v1.0.0'
    await gitCheckoutBranchOrphan(branch, startpoint)
    
    expect(await gitBranchCurrent()).toBe(branch)
    expect(() => {tool.exec('git rev-parse branch-orphan')}).toThrow()
    
    const status = tool.exec('git status --short')
    expect(status).not.toBe('')
    status
      .split('\n')
      .filter(Boolean)
      .forEach(line => {
        expect(line.startsWith('A ')).toBe(true)
      })
  })
})
