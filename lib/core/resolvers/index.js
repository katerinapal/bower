import { GitFsResolver as GitFsResolver_GitFsResolver } from "./GitFsResolver";
import { GitRemoteResolver as GitRemoteResolver_GitRemoteResolver } from "./GitRemoteResolver";
import { GitHubResolver as GitHubResolver_GitHubResolver } from "./GitHubResolver";
import { SvnResolver as SvnResolver_SvnResolver } from "./SvnResolver";
import { FsResolver as FsResolver_FsResolver } from "./FsResolver";
import { UrlResolver as UrlResolver_UrlResolver } from "./UrlResolver";
module.exports = {
    GitFs: GitFsResolver_GitFsResolver,
    GitRemote: GitRemoteResolver_GitRemoteResolver,
    GitHub: GitHubResolver_GitHubResolver,
    Svn: SvnResolver_SvnResolver,
    Fs: FsResolver_FsResolver,
    Url: UrlResolver_UrlResolver
};
export { indexjs_indexjs as indexjs };
