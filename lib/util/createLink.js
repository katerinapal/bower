var createLink_createLink = createLink;
import { fs as fs_fsjs } from "./fs";
import ext_path_path from "path";
import ext_q_Q from "q";
import ext_mkdirp_mkdirp from "mkdirp";
import { createError as createError_createErrorjs } from "./createError";

var isWin = process.platform === 'win32';

function createLink(src, dst, type) {
    var dstDir = ext_path_path.dirname(dst);

    // Create directory
    return ext_q_Q.nfcall(ext_mkdirp_mkdirp, dstDir)
        // Check if source exists
        .then(function() {
            return ext_q_Q.nfcall(fs_fsjs.stat, src).fail(function(error) {
                if (error.code === 'ENOENT') {
                    throw createError_createErrorjs(
                        'Failed to create link to ' + ext_path_path.basename(src),
                        'ENOENT',
                        {
                            details:
                                src +
                                ' does not exist or points to a non-existent file'
                        }
                    );
                }

                throw error;
            });
        })
        // Create symlink
        .then(function(stat) {
            type = type || (stat.isDirectory() ? 'dir' : 'file');

            return ext_q_Q.nfcall(fs_fsjs.symlink, src, dst, type).fail(function(err) {
                if (!isWin || err.code !== 'EPERM') {
                    throw err;
                }

                // Try with type "junction" on Windows
                // Junctions behave equally to true symlinks and can be created in
                // non elevated terminal (well, not always..)
                return ext_q_Q.nfcall(fs_fsjs.symlink, src, dst, 'junction').fail(
                    function(err) {
                        throw createError_createErrorjs(
                            'Unable to create link to ' +
                                ext_path_path.basename(src),
                            err.code,
                            {
                                details:
                                    err.message.trim() +
                                    '\n\nTry running this command in an elevated terminal (run as root/administrator).'
                            }
                        );
                    }
                );
            });
        });
}

export { createLink_createLink as createLink };
