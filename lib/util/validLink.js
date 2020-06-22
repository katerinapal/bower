var validLink_validLink = validLink;
import ext_q_Q from "q";
import { fs as fs_fsjs } from "./fs";

function validLink(file) {
    // Ensures that a file is a symlink that points
    // to a valid file
    return ext_q_Q.nfcall(fs_fsjs.lstat, file)
        .then(function(lstat) {
            if (!lstat.isSymbolicLink()) {
                return [false];
            }

            return ext_q_Q.nfcall(fs_fsjs.stat, file).then(function(stat) {
                return [stat];
            });
        })
        .fail(function(err) {
            return [false, err];
        });
}

export { validLink_validLink as validLink };
