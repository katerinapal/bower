import ext_mout_mout from "mout";
import ext_q_Q from "q";
import { Project as coreProject_Projectjs } from "../core/Project";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function uninstall(logger, names, options, config) {
    if (!names.length) {
        return new ext_q_Q();
    }

    var project;

    options = options || {};
    config = config_defaultConfigjs(config);
    project = new coreProject_Projectjs(config, logger);

    return project.getTree(options).spread(function(tree, flattened) {
        // Uninstall nodes
        return project
            .uninstall(names, options)
            // Clean out non-shared uninstalled dependencies
            .then(function(uninstalled) {
                var names = Object.keys(uninstalled);
                var children = [];

                // Grab the dependencies of packages that were uninstalled
                ext_mout_mout.object.forOwn(flattened, function(node) {
                    if (names.indexOf(node.endpoint.name) !== -1) {
                        children.push.apply(
                            children,
                            ext_mout_mout.object.keys(node.dependencies)
                        );
                    }
                });

                // Clean them!
                return clean(project, children, uninstalled);
            });
    });
}

function clean(project, names, removed) {
    removed = removed || {};

    return project.getTree().spread(function(tree, flattened) {
        var nodes = [];
        var dependantsCounter = {};

        // Grab the nodes of each specified name
        ext_mout_mout.object.forOwn(flattened, function(node) {
            if (names.indexOf(node.endpoint.name) !== -1) {
                nodes.push(node);
            }
        });

        // Walk the down the tree, gathering dependants of the packages
        project.walkTree(
            tree,
            function(node, nodeName) {
                if (names.indexOf(nodeName) !== -1) {
                    dependantsCounter[nodeName] =
                        dependantsCounter[nodeName] || 0;
                    dependantsCounter[nodeName] += node.nrDependants;
                }
            },
            true
        );

        // Filter out those that have no dependants
        nodes = nodes.filter(function(node) {
            return !dependantsCounter[node.endpoint.name];
        });

        // Are we done?
        if (!nodes.length) {
            return ext_q_Q.resolve(removed);
        }

        // Grab the nodes after filtering
        names = nodes.map(function(node) {
            return node.endpoint.name;
        });

        // Uninstall them
        return project
            .uninstall(names)
            // Clean out non-shared uninstalled dependencies
            .then(function(uninstalled) {
                var children;

                ext_mout_mout.object.mixIn(removed, uninstalled);

                // Grab the dependencies of packages that were uninstalled
                children = [];
                nodes.forEach(function(node) {
                    children.push.apply(
                        children,
                        ext_mout_mout.object.keys(node.dependencies)
                    );
                });

                // Recurse!
                return clean(project, children, removed);
            });
    });
}

// -------------------

uninstall.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(
        {
            save: { type: Boolean, shorthand: 'S' },
            'save-dev': { type: Boolean, shorthand: 'D' }
        },
        argv
    );

    var names = options.argv.remain.slice(1);

    delete options.argv;

    return [names, options];
};

var encapsulated_uninstall;

encapsulated_uninstall = uninstall;
