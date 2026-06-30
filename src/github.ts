/** 解析 Github 链接获取 owner 和 repo */
export const parseGitHubRepo = (url: string) => {
  const reg = /github(?:\.com)?[:/](.+?)\/(.+?)(?:[#/?].+?)?(?:\.git)?$/
  const match = url.trim().match(reg)
  return match ? match.slice(1, 3) : []
}

/** 生成 GitHub 仓库主页地址 */
export const getGithubUrl = (owner: string, repo: string) => {
  return `https://github.com/${ owner }/${ repo }`
}

/** 生成 GitHub Release 页面地址 */
export const getGithubReleaseUrl = (owner: string, repo: string, tag: string) => {
  return `${ getGithubUrl(owner, repo) }/releases/tag/${ encodeURIComponent(tag) }`
}
