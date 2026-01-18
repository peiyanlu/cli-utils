import { runNpm } from './shell.js'


/** 获取指定包的版本 */
export const pkgVersion = (pkg: string) => {
  return runNpm([ 'view', pkg, 'version' ])
}
