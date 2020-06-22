var GitHubResolver_GitHubResolver = GitHubResolver;
import ext_util_util from "util";
import ext_path_path from "path";
import ext_mout_mout from "mout";
import ext_q_Q from "q";
import { GitRemoteResolver as GitRemoteResolver_GitRemoteResolverjs } from "./GitRemoteResolver";
import { download as utildownload_downloadjs } from "../../util/download";
import { extract as utilextract_extractjs } from "../../util/extract";
import { createError as utilcreateError_createErrorjs } from "../../util/createError";

function GitHubResolver(decEndpoint, config, logger) {
    var pair;

    GitRemoteResolver_GitRemoteResolverjs.call(this, decEndpoint, config, logger);

    // Grab the org/repo
    // /xxxxx/yyyyy.git or :xxxxx/yyyyy.git (.git is optional)
    pair = GitHubResolver.getOrgRepoPair(this._source);
    if (!pair) {
        throw utilcreateError_createErrorjs('Invalid GitHub URL', 'EINVEND', {
            details: this._source + ' does not seem to be a valid GitHub URL'
        });
    }

    this._org = pair.org;
    this._repo = pair.repo;

    // Ensure trailing for all protocols
    if (!ext_mout_mout.string.endsWith(this._source, '.git')) {
        this._source += '.git';
    }

    // Use https:// rather than git:// if on a proxy
    if (this._config.proxy || this._config.httpsProxy) {
        this._source = this._source.replace('git://', 'https://');
    }

    // Enable shallow clones for GitHub repos
    this._shallowClone = function() {
        return ext_q_Q.resolve(true);
    };
}

ext_util_util.inherits(GitHubResolver, GitRemoteResolver_GitRemoteResolverjs);
ext_mout_mout.object.mixIn(GitHubResolver, GitRemoteResolver_GitRemoteResolverjs);

// -----------------

GitHubResolver.prototype._checkout = function() {
    var msg;
    var name =
        this._resolution.tag ||
        this._resolution.branch ||
        this._resolution.commit;
    var tarballUrl =
        'https://github.com/' +
        this._org +
        '/' +
        this._repo +
        '/archive/' +
        name +
        '.tar.gz';

    var file = ext_path_path.join(this._tempDir, 'archive.tar.gz');
    var reqHeaders = {};
    var that = this;

    if (this._config.userAgent) {
        reqHeaders['User-Agent'] = this._config.userAgent;
    }

    this._logger.action('download', tarballUrl, {
        url: that._source,
        to: file
    });

    // Download tarball
    return utildownload_downloadjs(tarballUrl, file, {
        ca: this._config.ca.default,
        strictSSL: this._config.strictSsl,
        timeout: this._config.timeout,
        headers: reqHeaders
    })
        .progress(function(state) {
            // Retry?
            if (state.retry) {
                msg =
                    'Download of ' +
                    tarballUrl +
                    ' failed with ' +
                    state.error.code +
                    ', ';
                msg += 'retrying in ' + (state.delay / 1000).toFixed(1) + 's';
                that._logger.debug('error', state.error.message, {
                    error: state.error
                });
                return that._logger.warn('retry', msg);
            }

            // Progress
            msg =
                'received ' + (state.received / 1024 / 1024).toFixed(1) + 'MB';
            if (state.total) {
                msg +=
                    ' of ' +
                    (state.total / 1024 / 1024).toFixed(1) +
                    'MB downloaded, ';
                msg += state.percent + '%';
            }
            that._logger.info('progress', msg);
        })
        .then(
            function() {
                // Extract archive
                that._logger.action('extract', ext_path_path.basename(file), {
                    archive: file,
                    to: that._tempDir
                });

                return utilextract_extractjs(file, that._tempDir)
                    // Fallback to standard git clone if extraction failed
                    .fail(function(err) {
                        msg =
                            'Decompression of ' +
                            ext_path_path.basename(file) +
                            ' failed' +
                            (err.code ? ' with ' + err.code : '') +
                            ', ';
                        msg += 'trying with git..';
                        that._logger.debug('error', err.message, {
                            error: err
                        });
                        that._logger.warn('retry', msg);

                        return that
                            ._cleanTempDir()
                            .then(
                                GitRemoteResolver_GitRemoteResolverjs.prototype._checkout.bind(
                                    that
                                )
                            );
                    });
                // Fallback to standard git clone if download failed
            },
            function(err) {
                msg =
                    'Download of ' +
                    tarballUrl +
                    ' failed' +
                    (err.code ? ' with ' + err.code : '') +
                    ', ';
                msg += 'trying with git..';
                that._logger.debug('error', err.message, { error: err });
                that._logger.warn('retry', msg);

                return that
                    ._cleanTempDir()
                    .then(GitRemoteResolver_GitRemoteResolverjs.prototype._checkout.bind(that));
            }
        );
};

GitHubResolver.prototype._savePkgMeta = function(meta) {
    // Set homepage if not defined
    if (!meta.homepage) {
        meta.homepage = 'https://github.com/' + this._org + '/' + this._repo;
    }

    return GitRemoteResolver_GitRemoteResolverjs.prototype._savePkgMeta.call(this, meta);
};

// ----------------

GitHubResolver.getOrgRepoPair = function(url) {
    var match;

    match = url.match(
        /(?:@|:\/\/)github.com[:\/]([^\/\s]+?)\/([^\/\s]+?)(?:\.git)?\/?$/i
    );
    if (!match) {
        return null;
    }

    return {
        org: match[1],
        repo: match[2]
    };
};

export { GitHubResolver_GitHubResolver as GitHubResolver };
