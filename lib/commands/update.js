import { Project as coreProject_Projectjs } from "../core/Project";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function update(logger, names, options, config) {
    var project;

    options = options || {};
    config = config_defaultConfigjs(config);
    project = new coreProject_Projectjs(config, logger);

    // If names is an empty array, null them
    if (names && !names.length) {
        names = null;
    }

    return project.update(names, options);
}

// -------------------

update.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(
        {
            'force-latest': { type: Boolean, shorthand: 'F' },
            production: { type: Boolean, shorthand: 'p' }
        },
        argv
    );

    var names = options.argv.remain.slice(1);

    delete options.argv;

    return [names, options];
};

var encapsulated_update;

encapsulated_update = update;
