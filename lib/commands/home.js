import { Project as coreProject_Projectjs } from "../core/Project";
import ext_opn_open from "opn";
import ext_bowerendpointparser_endpointParser from "bower-endpoint-parser";
import { createError as utilcreateError_createErrorjs } from "../util/createError";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function home(logger, name, config) {
    var project;
    var promise;
    var decEndpoint;

    config = config_defaultConfigjs(config);
    project = new coreProject_Projectjs(config, logger);

    // Get the package meta
    // If no name is specified, read the project json
    // If a name is specified, fetch from the package repository
    if (!name) {
        promise = project.hasJson().then(function(json) {
            if (!json) {
                throw utilcreateError_createErrorjs('You are not inside a package', 'ENOENT');
            }

            return project.getJson();
        });
    } else {
        decEndpoint = ext_bowerendpointparser_endpointParser.decompose(name);
        promise = project
            .getPackageRepository()
            .fetch(decEndpoint)
            .spread(function(canonicalDir, pkgMeta) {
                return pkgMeta;
            });
    }

    // Get homepage and open it
    return promise.then(function(pkgMeta) {
        var homepage = pkgMeta.homepage;

        if (!homepage) {
            throw utilcreateError_createErrorjs('No homepage set for ' + pkgMeta.name, 'ENOHOME');
        }

        ext_opn_open(homepage, { wait: false });
        return homepage;
    });
}

// -------------------

home.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var name = options.argv.remain[1];

    return [name];
};

var encapsulated_home;

encapsulated_home = home;
