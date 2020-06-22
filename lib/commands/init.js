import ext_mout_mout from "mout";
import { fs as utilfs_fsjs } from "../util/fs";
import ext_path_path from "path";
import ext_q_Q from "q";
import ext_bowerendpointparser_endpointParser from "bower-endpoint-parser";
import { Project as coreProject_Projectjs } from "../core/Project";
import { defaultConfig as config_defaultConfigjs } from "../config";
import { GitHubResolver as coreresolversGitHubResolver_GitHubResolverjs } from "../core/resolvers/GitHubResolver";
import { cmd as utilcmd_cmdjs } from "../util/cmd";
import { createError as utilcreateError_createErrorjs } from "../util/createError";

function init(logger, config) {
    var project;

    config = config || {};

    if (!config.cwd) {
        config.cwd = process.cwd();
    }

    config = config_defaultConfigjs(config);

    // This command requires interactive to be enabled
    if (!config.interactive) {
        throw utilcreateError_createErrorjs('Register requires an interactive shell', 'ENOINT', {
            details:
                'Note that you can manually force an interactive shell with --config.interactive'
        });
    }

    project = new coreProject_Projectjs(config, logger);

    // Start with existing JSON details
    return (
        readJson(project, logger)
            // Fill in defaults
            .then(setDefaults.bind(null, config))
            // Now prompt user to make changes
            .then(promptUser.bind(null, logger))
            // Set ignore based on the response
            .spread(setIgnore.bind(null, config))
            // Set dependencies based on the response
            .spread(setDependencies.bind(null, project))
            // All done!
            .spread(saveJson.bind(null, project, logger))
    );
}

function readJson(project, logger) {
    return project.hasJson().then(function(json) {
        if (json) {
            logger.warn(
                'existing',
                'The existing ' +
                    ext_path_path.basename(json) +
                    ' file will be used and filled in'
            );
        }

        return project.getJson();
    });
}

function saveJson(project, logger, json) {
    // Cleanup empty props (null values, empty strings, objects and arrays)
    ext_mout_mout.object.forOwn(json, function(value, key) {
        if (!validConfigValue(value)) {
            delete json[key];
        }
    });

    logger.info('json', 'Generated json', { json: json });

    // Confirm the json with the user
    return ext_q_Q.nfcall(logger.prompt.bind(logger), {
        type: 'confirm',
        message: 'Looks good?',
        default: true
    }).then(function(good) {
        if (!good) {
            return null;
        }

        // Save json (true forces file creation)
        return project.saveJson(true);
    });
}

// Test if value is of a type supported by bower.json[0] - Object, Array, String, Boolean - or a Number
// [0]: https://github.com/bower/bower.json-spec
function validConfigValue(val) {
    return ext_mout_mout.lang.isObject(val) ||
    ext_mout_mout.lang.isArray(val) ||
    ext_mout_mout.lang.isString(val) ||
    ext_mout_mout.lang.isBoolean(val) ||
    ext_mout_mout.lang.isNumber(val);
}

function setDefaults(config, json) {
    var name;
    var promise = ext_q_Q.resolve();

    // Name
    if (!json.name) {
        json.name = ext_path_path.basename(config.cwd);
    }

    // Main
    if (!json.main) {
        // Remove '.js' from the end of the package name if it is there
        name = ext_path_path.basename(json.name, '.js');

        if (utilfs_fsjs.existsSync(ext_path_path.join(config.cwd, 'index.js'))) {
            json.main = 'index.js';
        } else if (utilfs_fsjs.existsSync(ext_path_path.join(config.cwd, name + '.js'))) {
            json.main = name + '.js';
        }
    }

    // Homepage
    if (!json.homepage) {
        // Set as GitHub homepage if it's a GitHub repository
        promise = promise.then(function() {
            return utilcmd_cmdjs('git', ['config', '--get', 'remote.origin.url'])
                .spread(function(stdout) {
                    var pair;

                    stdout = stdout.trim();
                    if (!stdout) {
                        return;
                    }

                    pair = coreresolversGitHubResolver_GitHubResolverjs.getOrgRepoPair(stdout);
                    if (pair) {
                        json.homepage =
                            'https://github.com/' + pair.org + '/' + pair.repo;
                    }
                })
                .fail(function() {});
        });
    }

    if (!json.authors) {
        promise = promise.then(function() {
            // Get the user name configured in git
            return utilcmd_cmdjs('git', [
                'config',
                '--get',
                '--global',
                'user.name'
            ]).spread(
                function(stdout) {
                    var gitEmail;
                    var gitName = stdout.trim();

                    // Abort if no name specified
                    if (!gitName) {
                        return;
                    }

                    // Get the user email configured in git
                    return utilcmd_cmdjs('git', [
                        'config',
                        '--get',
                        '--global',
                        'user.email'
                    ])
                        .spread(
                            function(stdout) {
                                gitEmail = stdout.trim();
                            },
                            function() {}
                        )
                        .then(function() {
                            json.authors = gitName;
                            json.authors += gitEmail
                                ? ' <' + gitEmail + '>'
                                : '';
                        });
                },
                function() {}
            );
        });
    }

    return promise.then(function() {
        return json;
    });
}

function promptUser(logger, json) {
    var questions = [
        {
            name: 'name',
            message: 'name',
            default: json.name,
            type: 'input'
        },
        {
            name: 'description',
            message: 'description',
            default: json.description,
            type: 'input'
        },
        {
            name: 'main',
            message: 'main file',
            default: json.main,
            type: 'input'
        },
        {
            name: 'keywords',
            message: 'keywords',
            default: json.keywords ? json.keywords.toString() : null,
            type: 'input'
        },
        {
            name: 'authors',
            message: 'authors',
            default: json.authors ? json.authors.toString() : null,
            type: 'input'
        },
        {
            name: 'license',
            message: 'license',
            default: json.license || 'MIT',
            type: 'input'
        },
        {
            name: 'homepage',
            message: 'homepage',
            default: json.homepage,
            type: 'input'
        },
        {
            name: 'dependencies',
            message: 'set currently installed components as dependencies?',
            default:
                !ext_mout_mout.object.size(json.dependencies) &&
                !ext_mout_mout.object.size(json.devDependencies),
            type: 'confirm'
        },
        {
            name: 'ignore',
            message: 'add commonly ignored files to ignore list?',
            default: true,
            type: 'confirm'
        },
        {
            name: 'private',
            message:
                'would you like to mark this package as private which prevents it from being accidentally published to the registry?',
            default: !!json.private,
            type: 'confirm'
        }
    ];

    return ext_q_Q.nfcall(logger.prompt.bind(logger), questions).then(function(
        answers
    ) {
        json.name = answers.name;
        json.description = answers.description;
        json.main = answers.main;
        json.keywords = toArray(answers.keywords);
        json.authors = toArray(answers.authors, ',');
        json.license = answers.license;
        json.homepage = answers.homepage;
        json.private = answers.private || null;

        return [json, answers];
    });
}

function toArray(value, splitter) {
    var arr = value.split(splitter || /[\s,]/);

    // Trim values
    arr = arr.map(function(item) {
        return item.trim();
    });

    // Filter empty values
    arr = arr.filter(function(item) {
        return !!item;
    });

    return arr.length ? arr : null;
}

function setIgnore(config, json, answers) {
    if (answers.ignore) {
        json.ignore = ext_mout_mout.array.combine(json.ignore || [], [
            '**/.*',
            'node_modules',
            'bower_components',
            config.directory,
            'test',
            'tests'
        ]);
    }

    return [json, answers];
}

function setDependencies(project, json, answers) {
    if (answers.dependencies) {
        return project.getTree().spread(function(tree, flattened, extraneous) {
            if (extraneous.length) {
                json.dependencies = {};

                // Add extraneous as dependencies
                extraneous.forEach(function(extra) {
                    var jsonEndpoint;

                    // Skip linked packages
                    if (extra.linked) {
                        return;
                    }

                    jsonEndpoint = ext_bowerendpointparser_endpointParser.decomposed2json(
                        extra.endpoint
                    );
                    ext_mout_mout.object.mixIn(json.dependencies, jsonEndpoint);
                });
            }

            return [json, answers];
        });
    }

    return [json, answers];
}

// -------------------

init.readOptions = function(argv) {
    return [];
};

var encapsulated_init;

encapsulated_init = init;
