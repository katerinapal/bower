var UrlResolver_UrlResolver = UrlResolver;
import ext_util_util from "util";
import ext_path_path from "path";
import { fs as utilfs_fsjs } from "../../util/fs";
import ext_url_url from "url";
import ext_request_request from "request";
import ext_q_Q from "q";
import ext_mout_mout from "mout";
import ext_junk_junk from "junk";
import { Resolver as Resolver_Resolverjs } from "./Resolver";
import { download as utildownload_downloadjs } from "../../util/download";
import { canExtract as extractjs_canExtract, extract as utilextract_extractjs } from "../../util/extract";
import { createError as utilcreateError_createErrorjs } from "../../util/createError";

function UrlResolver(decEndpoint, config, logger) {
    Resolver_Resolverjs.call(this, decEndpoint, config, logger);

    // If target was specified, error out
    if (this._target !== '*') {
        throw utilcreateError_createErrorjs("URL sources can't resolve targets", 'ENORESTARGET');
    }

    // If the name was guessed
    if (this._guessedName) {
        // Remove the ?xxx part
        this._name = this._name.replace(/\?.*$/, '');
        // Remove extension
        this._name = this._name.substr(
            0,
            this._name.length - ext_path_path.extname(this._name).length
        );
    }

    this._remote = ext_url_url.parse(this._source);
}

ext_util_util.inherits(UrlResolver, Resolver_Resolverjs);
ext_mout_mout.object.mixIn(UrlResolver, Resolver_Resolverjs);

// -----------------

UrlResolver.isTargetable = function() {
    return false;
};

UrlResolver.prototype._hasNew = function(pkgMeta) {
    var oldCacheHeaders = pkgMeta._cacheHeaders || {};
    var reqHeaders = {};

    // If the previous cache headers contain an ETag,
    // send the "If-None-Match" header with it
    if (oldCacheHeaders.ETag) {
        reqHeaders['If-None-Match'] = oldCacheHeaders.ETag;
    }

    if (this._config.userAgent) {
        reqHeaders['User-Agent'] = this._config.userAgent;
    }

    // Make an HEAD request to the source
    return ext_q_Q.nfcall(ext_request_request.head, this._source, {
        ca: this._config.ca.default,
        strictSSL: this._config.strictSsl,
        timeout: this._config.timeout,
        headers: reqHeaders
    })
        // Compare new headers with the old ones
        .spread(
            function(response) {
                var cacheHeaders;

                // If the server responded with 303 then the resource
                // still has the same ETag
                if (response.statusCode === 304) {
                    return false;
                }

                // If status code is not in the 2xx range,
                // then just resolve to true
                if (
                    response.statusCode < 200 ||
                    response.statusCode >= 300
                ) {
                    return true;
                }

                // Fallback to comparing cache headers
                cacheHeaders = this._collectCacheHeaders(response);
                return !ext_mout_mout.object.equals(oldCacheHeaders, cacheHeaders);
            }.bind(this),
            function() {
                // Assume new contents if the request failed
                // Note that we do not retry the request using the "request-replay" module
                // because it would take too long
                return true;
            }
        );
};

// TODO: There's room for improvement by using streams if the URL
//       is an archive file, by piping read stream to the zip extractor
//       This will likely increase the complexity of code but might worth it

UrlResolver.prototype._resolve = function() {
    // Download
    return (
        this._download()
            // Parse headers
            .spread(this._parseHeaders.bind(this))
            // Extract file
            .spread(this._extract.bind(this))
            // Rename file to index
            .then(this._rename.bind(this))
    );
};

// -----------------

UrlResolver.prototype._parseSourceURL = function(_url) {
    return ext_url_url.parse(ext_path_path.basename(_url)).pathname;
};

UrlResolver.prototype._download = function() {
    var fileName = this._parseSourceURL(this._source);

    if (!fileName) {
        this._source = this._source.replace(/\/(?=\?|#)/, '');
        fileName = this._parseSourceURL(this._source);
    }

    var file = ext_path_path.join(this._tempDir, fileName);
    var reqHeaders = {};
    var that = this;

    if (this._config.userAgent) {
        reqHeaders['User-Agent'] = this._config.userAgent;
    }

    this._logger.action('download', that._source, {
        url: that._source,
        to: file
    });

    // Download the file
    return utildownload_downloadjs(this._source, file, {
        ca: this._config.ca.default,
        strictSSL: this._config.strictSsl,
        timeout: this._config.timeout,
        headers: reqHeaders
    })
        .progress(function(state) {
            var msg;

            // Retry?
            if (state.retry) {
                msg =
                    'Download of ' +
                    that._source +
                    ' failed' +
                    (state.error.code ? ' with ' + state.error.code : '') +
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
        .then(function(response) {
            that._response = response;
            return [file, response];
        });
};

UrlResolver.prototype._parseHeaders = function(file, response) {
    var disposition;
    var newFile;
    var match;

    // Check if we got a Content-Disposition header
    disposition = response.headers['content-disposition'];
    if (!disposition) {
        return ext_q_Q.resolve([file, response]);
    }

    // Since there's various security issues with parsing this header, we only
    // interpret word chars plus dots, dashes and spaces
    match = disposition.match(/filename=(?:"([\w\-\. ]+)")/i);
    if (!match) {
        // The spec defines that the filename must be in quotes,
        // though a wide range of servers do not follow the rule
        match = disposition.match(/filename=([\w\-\.]+)/i);
        if (!match) {
            return ext_q_Q.resolve([file, response]);
        }
    }

    // Trim spaces
    newFile = match[1].trim();

    // The filename can't end with a dot because this is known
    // to cause issues in Windows
    // See: http://superuser.com/questions/230385/dots-at-end-of-file-name
    if (ext_mout_mout.string.endsWith(newFile, '.')) {
        return ext_q_Q.resolve([file, response]);
    }

    newFile = ext_path_path.join(this._tempDir, newFile);

    return ext_q_Q.nfcall(utilfs_fsjs.rename, file, newFile).then(function() {
        return [newFile, response];
    });
};

UrlResolver.prototype._extract = function(file, response) {
    var mimeType = response.headers['content-type'];

    if (mimeType) {
        // Clean everything after ; and trim the end result
        mimeType = mimeType.split(';')[0].trim();
        // Some servers add quotes around the content-type, so we trim that also
        mimeType = ext_mout_mout.string.trim(mimeType, ['"', "'"]);
    }

    if (!extractjs_canExtract(file, mimeType)) {
        return ext_q_Q.resolve();
    }

    this._logger.action('extract', ext_path_path.basename(this._source), {
        archive: file,
        to: this._tempDir
    });

    return utilextract_extractjs(file, this._tempDir, {
        mimeType: mimeType
    });
};

UrlResolver.prototype._rename = function() {
    return ext_q_Q.nfcall(utilfs_fsjs.readdir, this._tempDir).then(
        function(files) {
            var file;
            var oldPath;
            var newPath;

            // Remove any OS specific files from the files array
            // before checking its length
            files = files.filter(ext_junk_junk.isnt);

            // Only rename if there's only one file and it's not the json
            if (
                files.length === 1 &&
                !/^(component|bower)\.json$/.test(files[0])
            ) {
                file = files[0];
                this._singleFile = 'index' + ext_path_path.extname(file);
                oldPath = ext_path_path.join(this._tempDir, file);
                newPath = ext_path_path.join(this._tempDir, this._singleFile);

                return ext_q_Q.nfcall(utilfs_fsjs.rename, oldPath, newPath);
            }
        }.bind(this)
    );
};

UrlResolver.prototype._savePkgMeta = function(meta) {
    // Store collected headers in the package meta
    meta._cacheHeaders = this._collectCacheHeaders(this._response);

    // Store ETAG under _release
    if (meta._cacheHeaders.ETag) {
        meta._release =
            'e-tag:' +
            ext_mout_mout.string.trim(meta._cacheHeaders.ETag.substr(0, 10), '"');
    }

    // Store main if is a single file
    if (this._singleFile) {
        meta.main = this._singleFile;
    }

    return Resolver_Resolverjs.prototype._savePkgMeta.call(this, meta);
};

UrlResolver.prototype._collectCacheHeaders = function(res) {
    var headers = {};

    // Collect cache headers
    this.constructor._cacheHeaders.forEach(function(name) {
        var value = res.headers[name.toLowerCase()];

        if (value != null) {
            headers[name] = value;
        }
    });

    return headers;
};

UrlResolver._cacheHeaders = [
    'Content-MD5',
    'ETag',
    'Last-Modified',
    'Content-Language',
    'Content-Length',
    'Content-Type',
    'Content-Disposition'
];

export { UrlResolver_UrlResolver as UrlResolver };
