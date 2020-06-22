import ext_path_path from "path";
import { rimrafjs as utilrimraf_rimrafjsjs } from "../util/rimraf";
import ext_q_Q from "q";
import { Project as coreProject_Projectjs } from "../core/Project";
import { createLink as utilcreateLink_createLinkjs } from "../util/createLink";
import { defaultConfig as config_defaultConfigjs } from "../config";
import { relativeToBaseDir as utilrelativeToBaseDir_relativeToBaseDirjs } from "../util/relativeToBaseDir";
import * as utilcli_readOptionsjs from "../util/cli";

function link(logger, name, localName, config) {
    if (name) {
        return linkTo(logger, name, localName, config);
    } else {
        return linkSelf(logger, config);
    }
}

function linkSelf(logger, config) {
    var project;

    config = config_defaultConfigjs(config);
    project = new coreProject_Projectjs(config, logger);

    return project.getJson().then(function(json) {
        var src = config.cwd;
        var dst = ext_path_path.join(config.storage.links, json.name);

        // Delete previous link if any
        return ext_q_Q.nfcall(utilrimraf_rimrafjsjs, dst)
            // Link globally
            .then(function() {
                return utilcreateLink_createLinkjs(src, dst);
            })
            .then(function() {
                return {
                    src: src,
                    dst: dst
                };
            });
    });
}

function linkTo(logger, name, localName, config) {
    var src;
    var dst;
    var project;

    config = config_defaultConfigjs(config);
    project = new coreProject_Projectjs(config, logger);

    localName = localName || name;
    src = ext_path_path.join(config.storage.links, name);
    dst = ext_path_path.join(utilrelativeToBaseDir_relativeToBaseDirjs(config.cwd)(config.directory), localName);

    // Delete destination folder if any
    return ext_q_Q.nfcall(utilrimraf_rimrafjsjs, dst)
        // Link locally
        .then(function() {
            return utilcreateLink_createLinkjs(src, dst);
        })
        // Install linked package deps
        .then(function() {
            return project.update([localName]);
        })
        .then(function(installed) {
            return {
                src: src,
                dst: dst,
                installed: installed
            };
        });
}

// -------------------

link.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var name = options.argv.remain[1];
    var localName = options.argv.remain[2];

    return [name, localName];
};

var encapsulated_link;

encapsulated_link = link;
