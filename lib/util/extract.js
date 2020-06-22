import ext_path_path from "path";
import { fs as fs_fsjs } from "./fs";
import ext_zlib_zlib from "zlib";
import ext_decompresszip_DecompressZip from "decompress-zip";
import ext_tarfs_tar from "tar-fs";
import ext_q_Q from "q";
import ext_mout_mout from "mout";
import ext_junk_junk from "junk";
import { createError as createError_createErrorjs } from "./createError";
import ext_fswritestreamatomic_createWriteStream from "fs-write-stream-atomic";
import ext_destroy_destroy from "destroy";
import ext_tmp_tmp from "tmp";
var extract_canExtract;

// This forces the default chunk size to something small in an attempt
// to avoid issue #314
ext_zlib_zlib.Z_DEFAULT_CHUNK = 1024 * 8;

var extractors;
var extractorTypes;

extractors = {
    '.zip': extractZip,
    '.tar': extractTar,
    '.tar.gz': extractTarGz,
    '.tgz': extractTarGz,
    '.gz': extractGz,
    'application/zip': extractZip,
    'application/x-zip': extractZip,
    'application/x-zip-compressed': extractZip,
    'application/x-tar': extractTar,
    'application/x-tgz': extractTarGz,
    'application/x-gzip': extractGz
};

extractorTypes = Object.keys(extractors);

function extractZip(archive, dst) {
    var deferred = ext_q_Q.defer();

    new ext_decompresszip_DecompressZip(archive)
        .on('error', deferred.reject)
        .on('extract', deferred.resolve.bind(deferred, dst))
        .extract({
            path: dst,
            follow: false, // Do not follow symlinks (#699)
            filter: filterSymlinks // Filter symlink files
        });

    return deferred.promise;
}

function extractTar(archive, dst) {
    var deferred = ext_q_Q.defer();

    var stream = fs_fsjs.createReadStream(archive);

    var reject = function(error) {
        ext_destroy_destroy(stream);
        deferred.reject(error);
    };

    stream
        .on('error', reject)
        .pipe(
            ext_tarfs_tar.extract(dst, {
                ignore: isSymlink, // Filter symlink files
                dmode: 0555, // Ensure dirs are readable
                fmode: 0444 // Ensure files are readable
            })
        )
        .on('error', reject)
        .on('finish', function(result) {
            ext_destroy_destroy(stream);
            deferred.resolve(dst);
        });

    return deferred.promise;
}

function extractTarGz(archive, dst) {
    var deferred = ext_q_Q.defer();

    var stream = fs_fsjs.createReadStream(archive);

    var reject = function(error) {
        ext_destroy_destroy(stream);
        deferred.reject(error);
    };

    stream
        .on('error', reject)
        .pipe(ext_zlib_zlib.createGunzip())
        .on('error', reject)
        .pipe(
            ext_tarfs_tar.extract(dst, {
                ignore: isSymlink, // Filter symlink files
                dmode: 0555, // Ensure dirs are readable
                fmode: 0444 // Ensure files are readable
            })
        )
        .on('error', reject)
        .on('finish', function(result) {
            ext_destroy_destroy(stream);
            deferred.resolve(dst);
        });

    return deferred.promise;
}

function extractGz(archive, dst) {
    var deferred = ext_q_Q.defer();

    var stream = fs_fsjs.createReadStream(archive);

    var reject = function(error) {
        ext_destroy_destroy(stream);
        deferred.reject(error);
    };
    stream
        .on('error', reject)
        .pipe(ext_zlib_zlib.createGunzip())
        .on('error', reject)
        .pipe(ext_fswritestreamatomic_createWriteStream(dst))
        .on('error', reject)
        .on('finish', function(result) {
            ext_destroy_destroy(stream);
            deferred.resolve(dst);
        });

    return deferred.promise;
}

function isSymlink(_, entry) {
    return entry.type === 'symlink';
}

function filterSymlinks(entry) {
    return entry.type !== 'SymbolicLink';
}

function getExtractor(archive) {
    // Make the archive lower case to match against the types
    // This ensures that upper-cased extensions work
    archive = archive.toLowerCase();

    var type = ext_mout_mout.array.find(extractorTypes, function(type) {
        return ext_mout_mout.string.endsWith(archive, type);
    });

    return type ? extractors[type] : null;
}

function isSingleDir(dir) {
    return ext_q_Q.nfcall(fs_fsjs.readdir, dir).then(function(files) {
        var singleDir;

        // Remove any OS specific files from the files array
        // before checking its length
        files = files.filter(ext_junk_junk.isnt);

        if (files.length !== 1) {
            return false;
        }

        singleDir = ext_path_path.join(dir, files[0]);

        return ext_q_Q.nfcall(fs_fsjs.stat, singleDir).then(function(stat) {
            return stat.isDirectory() ? singleDir : false;
        });
    });
}

function moveDirectory(srcDir, destDir) {
    return ext_q_Q.nfcall(fs_fsjs.readdir, srcDir)
        .then(function(files) {
            var promises = files.map(function(file) {
                var src = ext_path_path.join(srcDir, file);
                var dst = ext_path_path.join(destDir, file);

                return ext_q_Q.nfcall(fs_fsjs.rename, src, dst);
            });

            return ext_q_Q.all(promises);
        })
        .then(function() {
            return ext_q_Q.nfcall(fs_fsjs.rmdir, srcDir);
        });
}

// -----------------------------

function canExtract(src, mimeType) {
    if (mimeType && mimeType !== 'application/octet-stream') {
        return !!getExtractor(mimeType);
    }

    return !!getExtractor(src);
}

// Available options:
// - keepArchive: true to keep the archive afterwards (defaults to false)
// - keepStructure: true to keep the extracted structure unchanged (defaults to false)
function extract(src, dst, opts) {
    var extractor;
    var promise;

    opts = opts || {};
    extractor = getExtractor(src);

    // Try to get extractor from mime type
    if (!extractor && opts.mimeType) {
        extractor = getExtractor(opts.mimeType);
    }

    // If extractor is null, then the archive type is unknown
    if (!extractor) {
        return ext_q_Q.reject(
            createError_createErrorjs(
                'File ' + src + ' is not a known archive',
                'ENOTARCHIVE'
            )
        );
    }

    // Extract to a temporary directory in case of file name clashes
    return ext_q_Q.nfcall(ext_tmp_tmp.dir, {
        template: dst + '-XXXXXX',
        mode: 0o777 & ~process.umask()
    })
        .then(function(tempDir) {
            // nfcall may return multiple callback arguments as an array
            return Array.isArray(tempDir) ? tempDir[0] : tempDir;
        })
        .then(function(tempDir) {
            // Check archive file size
            promise = ext_q_Q.nfcall(fs_fsjs.stat, src).then(function(stat) {
                if (stat.size <= 8) {
                    throw createError_createErrorjs(
                        'File ' + src + ' is an invalid archive',
                        'ENOTARCHIVE'
                    );
                }

                // Extract archive
                return extractor(src, tempDir);
            });

            // Remove archive
            if (!opts.keepArchive) {
                promise = promise.then(function() {
                    return ext_q_Q.nfcall(fs_fsjs.unlink, src);
                });
            }

            // Move contents from the temporary directory
            // If the contents are a single directory (and we're not preserving structure),
            // move its contents directly instead.
            promise = promise
                .then(function() {
                    return isSingleDir(tempDir);
                })
                .then(function(singleDir) {
                    if (singleDir && !opts.keepStructure) {
                        return moveDirectory(singleDir, dst);
                    } else {
                        return moveDirectory(tempDir, dst);
                    }
                });

            // Resolve promise to the dst dir
            return promise.then(function() {
                return dst;
            });
        });
}

module.exports = extract;
extract_canExtract = canExtract;;
export { extract_canExtract as canExtract, extract };
