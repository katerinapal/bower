import ext_tty_tty from "tty";
import ext_mout_mout from "mout";
import ext_bowerconfig_bowerConfig from "bower-config";
import ext_configstore_Configstore from "configstore";
import * as utilcli_readOptionsjs from "./util/cli";
var config_reset;
var config_restore;
var object = ext_mout_mout.object;

var current;

function defaultConfig(config) {
    config = config || {};

    return readCachedConfig(config.cwd || process.cwd(), config);
}

function readCachedConfig(cwd, overwrites) {
    current = ext_bowerconfig_bowerConfig.create(cwd).load(overwrites);

    var config = current.toObject();

    var configstore = new ext_configstore_Configstore('bower-github').all;

    object.mixIn(config, configstore);

    // If interactive is auto (null), guess its value
    if (config.interactive == null) {
        config.interactive =
            process.bin === 'bower' && ext_tty_tty.isatty(1) && !process.env.CI;
    }

    // Merge common CLI options into the config
    if (process.bin === 'bower') {
        object.mixIn(
            config,
            utilcli_readOptionsjs.readOptions({
                force: { type: Boolean, shorthand: 'f' },
                offline: { type: Boolean, shorthand: 'o' },
                verbose: { type: Boolean, shorthand: 'V' },
                quiet: { type: Boolean, shorthand: 'q' },
                loglevel: { type: String, shorthand: 'l' },
                json: { type: Boolean, shorthand: 'j' },
                silent: { type: Boolean, shorthand: 's' }
            })
        );
    }

    return config;
}

function restoreConfig() {
    if (current) {
        current.restore();
    }
}

function resetCache() {
    restoreConfig();
    current = undefined;
}

module.exports = defaultConfig;
config_restore = restoreConfig;;
config_reset = resetCache;;
export { config_restore as restore, config_reset as reset, defaultConfig };
