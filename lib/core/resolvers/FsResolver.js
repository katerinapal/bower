var FsResolver_FsResolver = FsResolver;
import ext_util_util from "util";
import { fs as utilfs_fsjs } from "../../util/fs";
import ext_path_path from "path";
import ext_mout_mout from "mout";
import ext_q_Q from "q";
import ext_junk_junk from "junk";
import { Resolver as Resolver_Resolverjs } from "./Resolver";
import * as utilcopy_copyjsjs from "../../util/copy";
import { canExtract as extractjs_canExtract, extract as utilextract_extractjs } from "../../util/extract";
import { createError as utilcreateError_createErrorjs } from "../../util/createError";

function FsResolver(decEndpoint, config, logger) {
    Resolver_Resolverjs.call(this, decEndpoint, config, logger);

    // Ensure absolute path
    this._source = ext_path_path.resolve(this._config.cwd, this._source);

    // If target was specified, simply reject the promise
    if (this._target !== '*') {
        throw utilcreateError_createErrorjs(
            "File system sources can't resolve targets",
            'ENORESTARGET'
        );
    }

    // If the name was guessed
    if (this._guessedName) {
        // Remove extension
        this._name = this._name.substr(
            0,
            this._name.length - ext_path_path.extname(this._name).length
        );
    }
}

ext_util_util.inherits(FsResolver, Resolver_Resolverjs);
ext_mout_mout.object.mixIn(FsResolver, Resolver_Resolverjs);

// -----------------

FsResolver.isTargetable = function() {
    return false;
};

// TODO: Should we store latest mtimes in the resolution and compare?
//       This would be beneficial when copying big files/folders

// TODO: There's room for improvement by using streams if the source
//       is an archive file, by piping read stream to the zip extractor
//       This will likely increase the complexity of code but might worth it
FsResolver.prototype._resolve = function() {
    return this._copy()
        .then(this._extract.bind(this))
        .then(this._rename.bind(this));
};

// -----------------

FsResolver.prototype._copy = function() {
    var that = this;

    return ext_q_Q.nfcall(utilfs_fsjs.stat, this._source).then(function(stat) {
        var dst;
        var copyOpts;
        var promise;

        that._sourceStat = stat;
        copyOpts = { mode: stat.mode };

        // If it's a folder
        if (stat.isDirectory()) {
            dst = that._tempDir;

            // Read the bower.json inside the folder, so that we
            // copy only the necessary files if it has ignore specified
            promise = that
                ._readJson(that._source)
                .then(function(json) {
                    copyOpts.ignore = json.ignore;
                    return utilcopy_copyjsjs.copyDir(that._source, dst, copyOpts);
                })
                .then(function() {
                    // Resolve to null because it's a dir
                    return;
                });
            // Else it's a file
        } else {
            dst = ext_path_path.join(that._tempDir, ext_path_path.basename(that._source));
            promise = utilcopy_copyjsjs
                .copyFile(that._source, dst, copyOpts)
                .then(function() {
                    return dst;
                });
        }

        that._logger.action('copy', that._source, {
            src: that._source,
            dst: dst
        });

        return promise;
    });
};

FsResolver.prototype._extract = function(file) {
    if (!file || !extractjs_canExtract(file)) {
        return ext_q_Q.resolve();
    }

    this._logger.action('extract', ext_path_path.basename(this._source), {
        archive: file,
        to: this._tempDir
    });

    return utilextract_extractjs(file, this._tempDir);
};

FsResolver.prototype._rename = function() {
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
                !/^(bower|component)\.json$/.test(files[0])
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

FsResolver.prototype._savePkgMeta = function(meta) {
    // Store main if is a single file
    if (this._singleFile) {
        meta.main = this._singleFile;
    }

    return Resolver_Resolverjs.prototype._savePkgMeta.call(this, meta);
};

export { FsResolver_FsResolver as FsResolver };
