import ext_rimraf_rimraf from "rimraf";
import ext_chmodr_chmodr from "chmodr";
import { fs as fs_fsjs } from "./fs";

var exportedObject = function(dir, callback) {
    var checkAndRetry = function(e) {
        fs_fsjs.lstat(dir, function(err, stats) {
            if (err) {
                if (err.code === 'ENOENT') return callback();
                return callback(e);
            }

            ext_chmodr_chmodr(dir, 0o777, function(err) {
                if (err) return callback(e);
                ext_rimraf_rimraf(dir, callback);
            });
        });
    };

    if (process.platform === 'win32') {
        checkAndRetry();
    } else {
        ext_rimraf_rimraf(dir, checkAndRetry);
    }
};

export { exportedObject as rimrafjs };

rimraf_exportedObject.sync = function(dir) {
    var checkAndRetry = function() {
        try {
            fs_fsjs.lstatSync(dir);
            ext_chmodr_chmodr.sync(dir, 0o777);
            return ext_rimraf_rimraf.sync(dir);
        } catch (e) {
            if (e.code === 'ENOENT') return;
            throw e;
        }
    };

    try {
        return ext_rimraf_rimraf.sync(dir);
    } catch (e) {
        return checkAndRetry();
    } finally {
        return checkAndRetry();
    }
};
