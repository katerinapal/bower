var Resolver_Resolver = Resolver;
import { fs as utilfs_fsjs } from "../../util/fs";
import ext_path_path from "path";
import ext_q_Q from "q";
import ext_tmp_tmp from "tmp";
import ext_mkdirp_mkdirp from "mkdirp";
import { rimrafjs as utilrimraf_rimrafjsjs } from "../../util/rimraf";
import { readJson as utilreadJson_readJsonjs } from "../../util/readJson";
import { createError as utilcreateError_createErrorjs } from "../../util/createError";
import { removeIgnores as utilremoveIgnores_removeIgnoresjs } from "../../util/removeIgnores";
import ext_md5hex_md5 from "md5-hex";

ext_tmp_tmp.setGracefulCleanup();

function Resolver(decEndpoint, config, logger) {
    this._source = decEndpoint.source;
    this._target = decEndpoint.target || '*';
    this._name = decEndpoint.name || ext_path_path.basename(this._source);

    this._config = config;
    this._logger = logger;

    this._guessedName = !decEndpoint.name;
}

// -----------------

Resolver.prototype.getSource = function() {
    return this._source;
};

Resolver.prototype.getName = function() {
    return this._name;
};

Resolver.prototype.getTarget = function() {
    return this._target;
};

Resolver.prototype.getTempDir = function() {
    return this._tempDir;
};

Resolver.prototype.getPkgMeta = function() {
    return this._pkgMeta;
};

Resolver.prototype.hasNew = function(pkgMeta) {
    var promise;
    var that = this;

    // If already working, error out
    if (this._working) {
        return ext_q_Q.reject(utilcreateError_createErrorjs('Already working', 'EWORKING'));
    }

    this._working = true;

    // Avoid reading the package meta if already given
    promise = this._hasNew(pkgMeta);

    return promise.fin(function() {
        that._working = false;
    });
};

Resolver.prototype.resolve = function() {
    var that = this;

    // If already working, error out
    if (this._working) {
        return ext_q_Q.reject(utilcreateError_createErrorjs('Already working', 'EWORKING'));
    }

    this._working = true;

    // Create temporary dir
    return (
        this._createTempDir()
            // Resolve self
            .then(this._resolve.bind(this))
            // Read json, generating the package meta
            .then(this._readJson.bind(this, null))
            // Apply and save package meta
            .then(function(meta) {
                return that
                    ._applyPkgMeta(meta)
                    .then(that._savePkgMeta.bind(that, meta));
            })
            .then(
                function() {
                    // Resolve with the folder
                    return that._tempDir;
                },
                function(err) {
                    // If something went wrong, unset the temporary dir
                    that._tempDir = null;
                    throw err;
                }
            )
            .fin(function() {
                that._working = false;
            })
    );
};

Resolver.prototype.isCacheable = function() {
    // Bypass cache for local dependencies
    if (
        this._source &&
        /^(?:file:[\/\\]{2}|[A-Z]:)?\.?\.?[\/\\]/.test(this._source)
    ) {
        return false;
    }

    // We don't want to cache moving targets like branches
    if (
        this._pkgMeta &&
        this._pkgMeta._resolution &&
        this._pkgMeta._resolution.type === 'branch'
    ) {
        return false;
    }

    return true;
};

// -----------------

// Abstract functions that must be implemented by concrete resolvers
Resolver.prototype._resolve = function() {
    throw new Error('_resolve not implemented');
};

// Abstract functions that can be re-implemented by concrete resolvers
// as necessary
Resolver.prototype._hasNew = function(pkgMeta) {
    return ext_q_Q.resolve(true);
};

Resolver.isTargetable = function() {
    return true;
};

Resolver.versions = function(source) {
    return ext_q_Q.resolve([]);
};

Resolver.clearRuntimeCache = function() {};

// -----------------

Resolver.prototype._createTempDir = function() {
    return ext_q_Q.nfcall(ext_mkdirp_mkdirp, this._config.tmp)
        .then(
            function() {
                return ext_q_Q.nfcall(ext_tmp_tmp.dir, {
                    template: ext_path_path.join(
                        this._config.tmp,
                        ext_md5hex_md5(this._name) + '-' + process.pid + '-XXXXXX'
                    ),
                    mode: 0o777 & ~process.umask(),
                    unsafeCleanup: true
                });
            }.bind(this)
        )
        .then(
            function(dir) {
                // nfcall may return multiple callback arguments as an array
                return (this._tempDir = Array.isArray(dir) ? dir[0] : dir);
            }.bind(this)
        );
};

Resolver.prototype._cleanTempDir = function() {
    var tempDir = this._tempDir;

    if (!tempDir) {
        return ext_q_Q.resolve();
    }

    // Delete and create folder
    return ext_q_Q.nfcall(utilrimraf_rimrafjsjs, tempDir)
        .then(function() {
            return ext_q_Q.nfcall(ext_mkdirp_mkdirp, tempDir, 0o777 & ~process.umask());
        })
        .then(function() {
            return tempDir;
        });
};

Resolver.prototype._readJson = function(dir) {
    var that = this;

    dir = dir || this._tempDir;
    return utilreadJson_readJsonjs(dir, {
        assume: { name: this._name },
        logger: that._logger
    }).spread(function(json, deprecated) {
        if (deprecated) {
            that._logger.warn(
                'deprecated',
                'Package ' +
                    that._name +
                    ' is using the deprecated ' +
                    deprecated
            );
        }

        return json;
    });
};

Resolver.prototype._applyPkgMeta = function(meta) {
    // Check if name defined in the json is different
    // If so and if the name was "guessed", assume the json name
    if (meta.name !== this._name && this._guessedName) {
        this._name = meta.name;
    }

    // Handle ignore property, deleting all files from the temporary directory
    // If no ignores were specified, simply resolve
    if (!meta.ignore || !meta.ignore.length) {
        return ext_q_Q.resolve(meta);
    }

    // Otherwise remove them from the temp dir
    return utilremoveIgnores_removeIgnoresjs(this._tempDir, meta).then(function() {
        return meta;
    });
};

Resolver.prototype._savePkgMeta = function(meta) {
    var that = this;
    var contents;

    // Store original source & target
    meta._source = this._source;
    meta._target = this._target;

    // Stringify contents
    contents = JSON.stringify(meta, null, 2);

    return ext_q_Q.nfcall(
        utilfs_fsjs.writeFile,
        ext_path_path.join(this._tempDir, '.bower.json'),
        contents
    ).then(function() {
        return (that._pkgMeta = meta);
    });
};

export { Resolver_Resolver as Resolver };
