import { runNpm } from './shell.js'


export const pkgVersion = (pkg: string) => {
  return runNpm([ 'view', pkg, 'version' ])
}
