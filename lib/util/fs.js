import ext_gracefulfs_fs from "graceful-fs";

var readdir = ext_gracefulfs_fs.readdir.bind(ext_gracefulfs_fs);
var readdirSync = ext_gracefulfs_fs.readdirSync.bind(ext_gracefulfs_fs);

var fs_fs;

fs_fs = ext_gracefulfs_fs;

module.exports.readdir = function(dir, callback) {
    ext_gracefulfs_fs.stat(dir, function(err, stats) {
        if (err) return callback(err);

        if (stats.isDirectory()) {
            return readdir(dir, callback);
        } else {
            var error = new Error("ENOTDIR, not a directory '" + dir + "'");
            error.code = 'ENOTDIR';
            error.path = dir;
            error.errono = -20;
            return callback(error);
        }
    });
};

module.exports.readdirSync = function(dir) {
    var stats = ext_gracefulfs_fs.statSync(dir);

    if (stats.isDirectory()) {
        return readdirSync(dir);
    } else {
        var error = new Error();
        error.code = 'ENOTDIR';
        throw error;
    }
};
export { fs_fs as fs };
