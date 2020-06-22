import ext_findupsync_findup from "findup-sync";

module.exports = require(ext_findupsync_findup('package.json', { cwd: __dirname })).version;
export { versionjs_versionjs as versionjs };
