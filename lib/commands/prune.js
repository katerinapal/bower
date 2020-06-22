import ext_mout_mout from "mout";
import { Project as coreProject_Projectjs } from "../core/Project";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function prune(logger, options, config) {
    var project;

    options = options || {};
    config = config_defaultConfigjs(config);
    project = new coreProject_Projectjs(config, logger);

    return clean(project, options);
}

function clean(project, options, removed) {
    removed = removed || {};

    // Continually call clean until there is no more extraneous
    // dependencies to remove
    return project
        .getTree(options)
        .spread(function(tree, flattened, extraneous) {
            var names = extraneous.map(function(extra) {
                return extra.endpoint.name;
            });

            // Uninstall extraneous
            return project
                .uninstall(names, options)
                .then(function(uninstalled) {
                    // Are we done?
                    if (!ext_mout_mout.object.size(uninstalled)) {
                        return removed;
                    }

                    // Not yet, recurse!
                    ext_mout_mout.object.mixIn(removed, uninstalled);
                    return clean(project, options, removed);
                });
        });
}

// -------------------

prune.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(
        {
            production: { type: Boolean, shorthand: 'p' }
        },
        argv
    );

    delete options.argv;

    return [options];
};

var encapsulated_prune;

encapsulated_prune = prune;
