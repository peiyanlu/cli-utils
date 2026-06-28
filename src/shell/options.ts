import { AsyncLocalStorage } from 'node:async_hooks'
import { BaseOptions, ExtraOptions } from './types.js'


class Options<Opts extends object> {
  private global: Partial<Opts> = {}
  private storage = new AsyncLocalStorage<Partial<Opts>>()
  
  private get stored() {
    return this.storage.getStore() ?? {}
  }
  
  configure(opts: Partial<Opts>) {
    Object.assign(this.global, opts)
  }
  
  resolve<T extends object>(opts?: Partial<T>) {
    return {
      ...this.global,
      ...this.stored,
      ...opts,
    } as Partial<Opts> & T
  }
  
  run<R>(opts: Partial<Opts>, fn: () => R): R {
    return this.storage.run(
      {
        ...this.stored,
        ...opts,
      },
      fn,
    )
  }
}


export const shell = new Options<BaseOptions & ExtraOptions>()
