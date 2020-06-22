import ext_bowerendpointparser_endpointParser from "bower-endpoint-parser";
import { Project as coreProject_Projectjs } from "../core/Project";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function install(logger, endpoints, options, config) {
    var project;
    var decEndpoints;

    options = options || {};
    config = config_defaultConfigjs(config);
    if (options.save === undefined) {
        options.save = config.defaultSave;
    }
    project = new coreProject_Projectjs(config, logger);

    // Convert endpoints to decomposed endpoints
    endpoints = endpoints || [];
    decEndpoints = endpoints.map(function(endpoint) {
        // handle @ as version divider
        var splitParts = endpoint.split('/');
        splitParts[splitParts.length - 1] = splitParts[
            splitParts.length - 1
        ].replace('@', '#');
        endpoint = splitParts.join('/');

        return ext_bowerendpointparser_endpointParser.decompose(endpoint);
    });

    return project.install(decEndpoints, options, config);
}

// -------------------

install.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(
        {
            'force-latest': { type: Boolean, shorthand: 'F' },
            production: { type: Boolean, shorthand: 'p' },
            save: { type: Boolean, shorthand: 'S' },
            'save-dev': { type: Boolean, shorthand: 'D' },
            'save-exact': { type: Boolean, shorthand: 'E' }
        },
        argv
    );

    var packages = options.argv.remain.slice(1);

    delete options.argv;

    return [packages, options];
};

var encapsulated_install;

encapsulated_install = install;
