import { fs as libutilfs_fsjs } from "../../../lib/util/fs";
import ext_path_path from "path";
import ext_bowerlogger_Logger from "bower-logger";
import { Resolver as libcoreresolversResolver_Resolverjs } from "../../../lib/core/resolvers/Resolver";
import { defaultConfig as libconfig_defaultConfigjs } from "../../../lib/config";

var resolver = new libcoreresolversResolver_Resolverjs({ source: 'foo' }, libconfig_defaultConfigjs(), new ext_bowerlogger_Logger());
resolver._createTempDir()
.then(function (dir) {
    // Need to write something to prevent tmp to automatically
    // remove the temp dir (it removes if empty)
    libutilfs_fsjs.writeFileSync(ext_path_path.join(dir, 'some_file'), 'foo');

    // Force an error
    throw new Error('Some error');
})
.done();
