var Project_Project = Project;
import ext_glob_glob from "glob";
import ext_path_path from "path";
import { fs as utilfs_fsjs } from "../util/fs";
import ext_q_Q from "q";
import ext_mout_mout from "mout";
import { rimrafjs as utilrimraf_rimrafjsjs } from "../util/rimraf";
import ext_bowerendpointparser_endpointParser from "bower-endpoint-parser";
import ext_bowerlogger_Logger from "bower-logger";
import ext_md5hex_md5 from "md5-hex";
import { Manager as Manager_Managerjs } from "./Manager";
import { createError as utilcreateError_createErrorjs } from "../util/createError";
import { readJson as utilreadJson_readJsonjs } from "../util/readJson";
import { validLink as utilvalidLink_validLinkjs } from "../util/validLink";
import { scriptsjs as scripts_scriptsjsjs } from "./scripts";
import { relativeToBaseDir as utilrelativeToBaseDir_relativeToBaseDirjs } from "../util/relativeToBaseDir";
var semver = {};

function Project(config, logger) {
    this._config = config;
    this._logger = logger || new ext_bowerlogger_Logger();
    this._manager = new Manager_Managerjs(this._config, this._logger);

    this._options = {};
}

// -----------------

Project.prototype.install = function(decEndpoints, options, config) {
    var that = this;
    var targets = [];
    var resolved = {};
    var incompatibles = [];

    // If already working, error out
    if (this._working) {
        return ext_q_Q.reject(utilcreateError_createErrorjs('Already working', 'EWORKING'));
    }

    this._options = options || {};
    this._config = config || {};
    this._working = true;

    // Analyse the project
    return this._analyse()
        .spread(function(json, tree) {
            // It shows an error when issuing `bower install`
            // and no bower.json is present in current directory
            if (!that._jsonFile && decEndpoints.length === 0) {
                throw utilcreateError_createErrorjs('No bower.json present', 'ENOENT');
            }

            // Recover tree
            that.walkTree(
                tree,
                function(node, name) {
                    if (node.incompatible) {
                        incompatibles.push(node);
                    } else if (
                        node.missing ||
                        node.different ||
                        that._config.force
                    ) {
                        targets.push(node);
                    } else {
                        resolved[name] = node;
                    }
                },
                true
            );

            // Add decomposed endpoints as targets
            decEndpoints = decEndpoints || [];
            decEndpoints.forEach(function(decEndpoint) {
                // Mark as new so that a conflict for this target
                // always require a choice
                // Also allows for the target to be converted in case
                // of being *
                decEndpoint.newly = true;
                targets.push(decEndpoint);
            });

            // Bootstrap the process
            return that._bootstrap(targets, resolved, incompatibles);
        })
        .then(function() {
            return that._manager.preinstall(that._json);
        })
        .then(function() {
            return that._manager.install(that._json);
        })
        .then(function(installed) {
            // Handle save and saveDev options
            if (
                that._options.save ||
                that._options.saveDev ||
                that._options.saveExact ||
                that._config.save ||
                that._config.saveExact
            ) {
                // Cycle through the specified endpoints
                decEndpoints.forEach(function(decEndpoint) {
                    var jsonEndpoint;

                    jsonEndpoint = ext_bowerendpointparser_endpointParser.decomposed2json(decEndpoint);

                    if (that._options.saveExact || that._config.saveExact) {
                        if (decEndpoint.name !== decEndpoint.source) {
                            jsonEndpoint[decEndpoint.name] =
                                decEndpoint.source +
                                '#' +
                                decEndpoint.pkgMeta.version;
                        } else {
                            jsonEndpoint[decEndpoint.name] =
                                decEndpoint.pkgMeta.version;
                        }
                    }

                    if (that._options.saveDev) {
                        that._json.devDependencies = ext_mout_mout.object.mixIn(
                            that._json.devDependencies || {},
                            jsonEndpoint
                        );
                    } else {
                        that._json.dependencies = ext_mout_mout.object.mixIn(
                            that._json.dependencies || {},
                            jsonEndpoint
                        );
                    }
                });
            }

            // Save JSON, might contain changes to dependencies and resolutions
            return that.saveJson().then(function() {
                return that._manager.postinstall(that._json).then(function() {
                    return installed;
                });
            });
        })
        .fin(function() {
            that._installed = null;
            that._working = false;
        });
};

Project.prototype.update = function(names, options) {
    var that = this;
    var targets = [];
    var resolved = {};
    var incompatibles = [];

    // If already working, error out
    if (this._working) {
        return ext_q_Q.reject(utilcreateError_createErrorjs('Already working', 'EWORKING'));
    }

    this._options = options || {};
    this._working = true;

    // Analyse the project
    return this._analyse()
        .spread(function(json, tree, flattened) {
            // If no names were specified, update every package
            if (!names) {
                // Mark each root dependency as targets
                that.walkTree(
                    tree,
                    function(node) {
                        // We don't know the real source of linked packages
                        // Instead we read its dependencies
                        if (node.linked) {
                            targets.push.apply(
                                targets,
                                ext_mout_mout.object.values(node.dependencies)
                            );
                        } else {
                            targets.push(node);
                        }

                        return false;
                    },
                    true
                );
                // Otherwise, selectively update the specified ones
            } else {
                // Error out if some of the specified names
                // are not installed
                names.forEach(function(name) {
                    if (!flattened[name]) {
                        throw utilcreateError_createErrorjs(
                            'Package ' + name + ' is not installed',
                            'ENOTINS',
                            {
                                name: name
                            }
                        );
                    }
                });

                // Add packages whose names are specified to be updated
                that.walkTree(
                    tree,
                    function(node, name) {
                        if (names.indexOf(name) !== -1) {
                            // We don't know the real source of linked packages
                            // Instead we read its dependencies
                            if (node.linked) {
                                targets.push.apply(
                                    targets,
                                    ext_mout_mout.object.values(node.dependencies)
                                );
                            } else {
                                targets.push(node);
                            }

                            return false;
                        }
                    },
                    true
                );

                // Recover tree
                that.walkTree(
                    tree,
                    function(node, name) {
                        if (node.missing || node.different) {
                            targets.push(node);
                        } else if (node.incompatible) {
                            incompatibles.push(node);
                        } else {
                            resolved[name] = node;
                        }
                    },
                    true
                );
            }

            // Bootstrap the process
            return that
                ._bootstrap(targets, resolved, incompatibles)
                .then(function() {
                    return that._manager.preinstall(that._json);
                })
                .then(function() {
                    return that._manager.install(that._json);
                })
                .then(function(installed) {
                    // Save JSON, might contain changes to resolutions
                    return that.saveJson().then(function() {
                        return that._manager
                            .postinstall(that._json)
                            .then(function() {
                                return installed;
                            });
                    });
                });
        })
        .fin(function() {
            that._installed = null;
            that._working = false;
        });
};

function resolveUrlNames(names, flattened) {
    for (var i = 0; i < names.length; i++)
        if (!flattened[names[i]]) {
            var url = names[i].trim().replace(/\/$/, '');
            var packName;
            for (packName in flattened)
                if (!!flattened[packName].source)
                    if (
                        url ==
                        flattened[packName].source.trim().replace(/\/$/, '')
                    )
                        names[i] = packName;
        }
}

Project.prototype.uninstall = function(names, options) {
    var that = this;
    var packages = {};

    // If already working, error out
    if (this._working) {
        return ext_q_Q.reject(utilcreateError_createErrorjs('Already working', 'EWORKING'));
    }

    this._options = options || {};
    this._working = true;

    // Analyse the project
    return this._analyse()
        // Fill in the packages to be uninstalled
        .spread(function(json, tree, flattened) {
            var promise = ext_q_Q.resolve();
            resolveUrlNames(names, flattened);

            names.forEach(function(name) {
                var decEndpoint = flattened[name];

                // Check if it is not installed
                if (!decEndpoint || decEndpoint.missing) {
                    packages[name] = null;
                    return;
                }

                promise = promise.then(function() {
                    var message;
                    var data;
                    var dependantsNames;
                    var dependants = [];

                    // Walk the down the tree, gathering dependants of the package
                    that.walkTree(
                        tree,
                        function(node, nodeName) {
                            if (name === nodeName) {
                                dependants.push.apply(
                                    dependants,
                                    ext_mout_mout.object.values(node.dependants)
                                );
                            }
                        },
                        true
                    );

                    // Remove duplicates
                    dependants = ext_mout_mout.array.unique(dependants);

                    // Note that the root is filtered from the dependants
                    // as well as other dependants marked to be uninstalled
                    dependants = dependants.filter(function(dependant) {
                        return (
                            !dependant.root &&
                            names.indexOf(dependant.name) === -1
                        );
                    });

                    // If the package has no dependants or the force config is enabled,
                    // mark it to be removed
                    if (!dependants.length || that._config.force) {
                        packages[name] = decEndpoint.canonicalDir;
                        return;
                    }

                    // Otherwise we need to figure it out if the user really wants to remove it,
                    // even with dependants
                    // As such we need to prompt the user with a meaningful message
                    dependantsNames = dependants.map(function(dep) {
                        return dep.name;
                    });
                    dependantsNames.sort(function(name1, name2) {
                        return name1.localeCompare(name2);
                    });
                    dependantsNames = ext_mout_mout.array.unique(dependantsNames);
                    dependants = dependants.map(function(dependant) {
                        return that._manager.toData(dependant);
                    });
                    message =
                        dependantsNames.join(', ') +
                        ' depends on ' +
                        decEndpoint.name;
                    data = {
                        name: decEndpoint.name,
                        dependants: dependants
                    };

                    // If interactive is disabled, error out
                    if (!that._config.interactive) {
                        throw utilcreateError_createErrorjs(message, 'ECONFLICT', {
                            data: data
                        });
                    }

                    that._logger.conflict('mutual', message, data);

                    // Prompt the user
                    return ext_q_Q.nfcall(
                        that._logger.prompt.bind(that._logger),
                        {
                            type: 'confirm',
                            message: 'Continue anyway?',
                            default: true
                        }
                    ).then(function(confirmed) {
                        // If the user decided to skip it, remove from the array so that it won't
                        // influence subsequent dependants
                        if (!confirmed) {
                            ext_mout_mout.array.remove(names, name);
                        } else {
                            packages[name] = decEndpoint.canonicalDir;
                        }
                    });
                });
            });

            return promise;
        })
        // Remove packages
        .then(function() {
            return that._removePackages(packages);
        })
        .fin(function() {
            that._installed = null;
            that._working = false;
        });
};

Project.prototype.getTree = function(options) {
    this._options = options || {};

    return this._analyse().spread(
        function(json, tree, flattened) {
            var extraneous = [];
            var additionalKeys = [
                'missing',
                'extraneous',
                'different',
                'linked'
            ];

            // Convert tree
            tree = this._manager.toData(tree, additionalKeys);

            // Mark incompatibles
            this.walkTree(
                tree,
                function(node) {
                    var version;
                    var target = node.endpoint.target;

                    if (node.pkgMeta && semver.validRange(target)) {
                        version = node.pkgMeta.version;

                        // Ignore if target is '*' and resolved to a non-semver release
                        if (!version && target === '*') {
                            return;
                        }

                        if (!version || !semver.satisfies(version, target)) {
                            node.incompatible = true;
                        }
                    }
                },
                true
            );

            // Convert extraneous
            ext_mout_mout.object.forOwn(
                flattened,
                function(pkg) {
                    if (pkg.extraneous) {
                        extraneous.push(
                            this._manager.toData(pkg, additionalKeys)
                        );
                    }
                },
                this
            );

            // Convert flattened
            flattened = ext_mout_mout.object.map(
                flattened,
                function(node) {
                    return this._manager.toData(node, additionalKeys);
                },
                this
            );

            return [tree, flattened, extraneous];
        }.bind(this)
    );
};

Project.prototype.walkTree = function(node, fn, onlyOnce) {
    var result;
    var dependencies;
    var queue = ext_mout_mout.object.values(node.dependencies);

    if (onlyOnce === true) {
        onlyOnce = [];
    }

    while (queue.length) {
        node = queue.shift();
        result = fn(node, node.endpoint ? node.endpoint.name : node.name);

        // Abort traversal if result is false
        if (result === false) {
            continue;
        }

        // Add dependencies to the queue
        dependencies = ext_mout_mout.object.values(node.dependencies);

        // If onlyOnce was true, do not add if already traversed
        if (onlyOnce) {
            dependencies = dependencies.filter(function(dependency) {
                return !ext_mout_mout.array.find(onlyOnce, function(stacked) {
                    if (dependency.endpoint) {
                        return ext_mout_mout.object.equals(
                            dependency.endpoint,
                            stacked.endpoint
                        );
                    }

                    return (
                        dependency.name === stacked.name &&
                        dependency.source === stacked.source &&
                        dependency.target === stacked.target
                    );
                });
            });

            onlyOnce.push.apply(onlyOnce, dependencies);
        }

        queue.unshift.apply(queue, dependencies);
    }
};

Project.prototype.saveJson = function(forceCreate) {
    var file;
    var jsonStr = JSON.stringify(this._json, null, '  ') + '\n';
    var jsonHash = ext_md5hex_md5(jsonStr);

    // Save only if there's something different
    if (jsonHash === this._jsonHash) {
        return ext_q_Q.resolve();
    }

    // Error out if the json file does not exist, unless force create
    // is true
    if (!this._jsonFile && !forceCreate) {
        this._logger.warn(
            'no-json',
            'No bower.json file to save to, use bower init to create one'
        );
        return ext_q_Q.resolve();
    }

    file = this._jsonFile || ext_path_path.join(this._config.cwd, 'bower.json');
    return ext_q_Q.nfcall(utilfs_fsjs.writeFile, file, jsonStr).then(
        function() {
            this._jsonHash = jsonHash;
            this._jsonFile = file;
            return this._json;
        }.bind(this)
    );
};

Project.prototype.hasJson = function() {
    return this._readJson().then(
        function(json) {
            return json ? this._jsonFile : false;
        }.bind(this)
    );
};

Project.prototype.getJson = function() {
    return this._readJson();
};

Project.prototype.getManager = function() {
    return this._manager;
};

Project.prototype.getPackageRepository = function() {
    return this._manager.getPackageRepository();
};

// -----------------

Project.prototype._analyse = function() {
    return ext_q_Q.all([
        this._readJson(),
        this._readInstalled(),
        this._readLinks()
    ]).spread(
        function(json, installed, links) {
            var root;
            var jsonCopy = ext_mout_mout.lang.deepClone(json);

            root = {
                name: json.name,
                source: this._config.cwd,
                target: json.version || '*',
                pkgMeta: jsonCopy,
                canonicalDir: this._config.cwd,
                root: true
            };

            ext_mout_mout.object.mixIn(installed, links);

            // Mix direct extraneous as dependencies
            // (dependencies installed without --save/--save-dev)
            jsonCopy.dependencies = jsonCopy.dependencies || {};
            jsonCopy.devDependencies = jsonCopy.devDependencies || {};
            ext_mout_mout.object.forOwn(installed, function(decEndpoint, key) {
                var pkgMeta = decEndpoint.pkgMeta;
                var isSaved =
                    jsonCopy.dependencies[key] || jsonCopy.devDependencies[key];

                // The _direct propery is saved by the manager when .newly is specified
                // It may happen pkgMeta is undefined if package is uninstalled
                if (!isSaved && pkgMeta && pkgMeta._direct) {
                    decEndpoint.extraneous = true;

                    if (decEndpoint.linked) {
                        jsonCopy.dependencies[key] = pkgMeta.version || '*';
                    } else {
                        jsonCopy.dependencies[key] =
                            (pkgMeta._originalSource || pkgMeta._source) +
                            '#' +
                            pkgMeta._target;
                    }
                }
            });

            // Restore the original dependencies cross-references,
            // that is, the parent-child relationships
            this._restoreNode(root, installed, 'dependencies');
            // Do the same for the dev dependencies
            if (!this._options.production) {
                this._restoreNode(root, installed, 'devDependencies');
            }

            // Restore the rest of the extraneous (not installed directly)
            ext_mout_mout.object.forOwn(
                installed,
                function(decEndpoint, name) {
                    if (!decEndpoint.dependants) {
                        decEndpoint.extraneous = true;
                        this._restoreNode(
                            decEndpoint,
                            installed,
                            'dependencies'
                        );
                        // Note that it has no dependants, just dependencies!
                        root.dependencies[name] = decEndpoint;
                    }
                },
                this
            );

            // Remove root from the flattened tree
            delete installed[json.name];

            return [json, root, installed];
        }.bind(this)
    );
};

Project.prototype._bootstrap = function(targets, resolved, incompatibles) {
    var installed = ext_mout_mout.object.map(this._installed, function(decEndpoint) {
        return decEndpoint.pkgMeta;
    });

    this._json.resolutions = this._json.resolutions || {};

    // Configure the manager and kick in the resolve process
    return this._manager
        .configure({
            targets: targets,
            resolved: resolved,
            incompatibles: incompatibles,
            resolutions: this._json.resolutions,
            installed: installed,
            forceLatest: this._options.forceLatest
        })
        .resolve()
        .then(
            function() {
                // If the resolutions is empty, delete key
                if (!ext_mout_mout.object.size(this._json.resolutions)) {
                    delete this._json.resolutions;
                }
            }.bind(this)
        );
};

Project.prototype._readJson = function() {
    var that = this;

    if (this._json) {
        return ext_q_Q.resolve(this._json);
    }

    return ext_q_Q.fcall(function() {
        // This will throw if package.json does not exist
        return utilfs_fsjs.readFileSync(ext_path_path.join(that._config.cwd, 'package.json'));
    })
        .then(function(buffer) {
            // If package.json exists, use it's values as defaults
            var defaults = {},
                npm = JSON.parse(buffer.toString());

            defaults.name =
                npm.name || ext_path_path.basename(that._config.cwd) || 'root';
            defaults.description = npm.description;
            defaults.main = npm.main;
            defaults.authors = npm.contributors || npm.author;
            defaults.license = npm.license;
            defaults.keywords = npm.keywords;

            return defaults;
        })
        .catch(function(err) {
            // Most likely no package.json so just set default name
            return { name: ext_path_path.basename(that._config.cwd) || 'root' };
        })
        .then(function(defaults) {
            return that._json = utilreadJson_readJsonjs(that._config.cwd, {
                assume: defaults,
                logger: that._logger
            });
        })
        .spread(function(json, deprecated, assumed) {
            var jsonStr;

            if (deprecated) {
                that._logger.warn(
                    'deprecated',
                    'You are using the deprecated ' + deprecated + ' file'
                );
            }

            if (!assumed) {
                that._jsonFile = ext_path_path.join(
                    that._config.cwd,
                    deprecated ? deprecated : 'bower.json'
                );
            }

            jsonStr = JSON.stringify(json, null, '  ') + '\n';
            that._jsonHash = ext_md5hex_md5(jsonStr);
            return (that._json = json);
        });
};

Project.prototype._readInstalled = function() {
    var componentsDir;
    var that = this;

    if (this._installed) {
        return ext_q_Q.resolve(this._installed);
    }

    // Gather all folders that are actual packages by
    // looking for the package metadata file
    componentsDir = utilrelativeToBaseDir_relativeToBaseDirjs(this._config.cwd)(this._config.directory);
    return this._installed = ext_q_Q.nfcall(ext_glob_glob, '*/.bower.json', {
        cwd: componentsDir,
        dot: true
    }).then(function(filenames) {
        var promises;
        var decEndpoints = {};

        // Foreach bower.json found
        promises = filenames.map(function(filename) {
            var name = ext_path_path.dirname(filename);
            var metaFile = ext_path_path.join(componentsDir, filename);

            // Read package metadata
            return utilreadJson_readJsonjs(metaFile).spread(function(pkgMeta) {
                decEndpoints[name] = {
                    name: name,
                    source: pkgMeta._originalSource || pkgMeta._source,
                    target: pkgMeta._target,
                    canonicalDir: ext_path_path.dirname(metaFile),
                    pkgMeta: pkgMeta
                };
            });
        });

        // Wait until all files have been read
        // and resolve with the decomposed endpoints
        return ext_q_Q.all(promises).then(function() {
            return (that._installed = decEndpoints);
        });
    });
};

Project.prototype._readLinks = function() {
    var componentsDir;
    var that = this;

    // Read directory, looking for links
    componentsDir = utilrelativeToBaseDir_relativeToBaseDirjs(this._config.cwd)(this._config.directory);
    return ext_q_Q.nfcall(utilfs_fsjs.readdir, componentsDir).then(
        function(filenames) {
            var promises;
            var decEndpoints = {};

            promises = filenames.map(function(filename) {
                var dir = ext_path_path.join(componentsDir, filename);

                // Filter only those that are valid links
                return utilvalidLink_validLinkjs(dir).spread(function(valid, err) {
                    var name;

                    if (!valid) {
                        if (err) {
                            that._logger.debug(
                                'read-link',
                                'Link ' + dir + ' is invalid',
                                {
                                    filename: dir,
                                    error: err
                                }
                            );
                        }
                        return;
                    }

                    // Skip links to files (see #783)
                    if (!valid.isDirectory()) {
                        return;
                    }

                    name = ext_path_path.basename(dir);
                    return utilreadJson_readJsonjs(dir, {
                        assume: { name: name }
                    }).spread(function(json, deprecated) {
                        if (deprecated) {
                            that._logger.warn(
                                'deprecated',
                                'Package ' +
                                    name +
                                    ' is using the deprecated ' +
                                    deprecated
                            );
                        }

                        json._direct = true; // Mark as a direct dep of root
                        decEndpoints[name] = {
                            name: name,
                            source: dir,
                            target: '*',
                            canonicalDir: dir,
                            pkgMeta: json,
                            linked: true
                        };
                    });
                });
            });

            // Wait until all links have been read
            // and resolve with the decomposed endpoints
            return ext_q_Q.all(promises).then(function() {
                return decEndpoints;
            });
            // Ignore if folder does not exist
        },
        function(err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }

            return {};
        }
    );
};

Project.prototype._removePackages = function(packages) {
    var that = this;
    var promises = [];

    return scripts_scriptsjsjs
        .preuninstall(
            that._config,
            that._logger,
            packages,
            that._installed,
            that._json
        )
        .then(function() {
            ext_mout_mout.object.forOwn(packages, function(dir, name) {
                var promise;

                // Delete directory
                if (!dir) {
                    promise = ext_q_Q.resolve();
                    that._logger.warn(
                        'not-installed',
                        "'" +
                            name +
                            "'" +
                            ' cannot be uninstalled as it is not currently installed',
                        {
                            name: name
                        }
                    );
                } else {
                    promise = ext_q_Q.nfcall(utilrimraf_rimrafjsjs, dir);
                    that._logger.action('uninstall', name, {
                        name: name,
                        dir: dir
                    });
                }

                // Remove from json only if successfully deleted
                if (
                    (that._options.save || that._config.save) &&
                    that._json.dependencies
                ) {
                    promise = promise.then(function() {
                        delete that._json.dependencies[name];
                    });
                }

                if (that._options.saveDev && that._json.devDependencies) {
                    promise = promise.then(function() {
                        delete that._json.devDependencies[name];
                    });
                }

                promises.push(promise);
            });

            return ext_q_Q.all(promises);
        })
        .then(function() {
            return that.saveJson();
        })
        // Run post-uninstall hook before resolving with removed packages.
        .then(
            scripts_scriptsjsjs.postuninstall.bind(
                null,
                that._config,
                that._logger,
                packages,
                that._installed,
                that._json
            )
        )
        // Resolve with removed packages
        .then(function() {
            return ext_mout_mout.object.filter(packages, function(dir) {
                return !!dir;
            });
        });
};

Project.prototype._restoreNode = function(node, flattened, jsonKey, processed) {
    var deps;

    // Do not restore if the node is missing
    if (node.missing) {
        return;
    }

    node.dependencies = node.dependencies || {};
    node.dependants = node.dependants || {};
    processed = processed || {};

    // Only process deps that are not yet processed
    deps = ext_mout_mout.object.filter(node.pkgMeta[jsonKey], function(value, key) {
        return !processed[node.name + ':' + key];
    });

    ext_mout_mout.object.forOwn(
        deps,
        function(value, key) {
            var local = flattened[key];
            var json = ext_bowerendpointparser_endpointParser.json2decomposed(key, value);
            var restored;
            var compatible;
            var originalSource;

            // Check if the dependency is not installed
            if (!local) {
                flattened[key] = restored = json;
                restored.missing = true;
                // Even if it is installed, check if it's compatible
                // Note that linked packages are interpreted as compatible
                // This might change in the future: #673
            } else {
                compatible =
                    local.linked ||
                    (!local.missing && json.target === local.pkgMeta._target);

                if (!compatible) {
                    restored = json;

                    if (!local.missing) {
                        restored.pkgMeta = local.pkgMeta;
                        restored.canonicalDir = local.canonicalDir;
                        restored.incompatible = true;
                    } else {
                        restored.missing = true;
                    }
                } else {
                    restored = local;
                    ext_mout_mout.object.mixIn(local, json);
                }

                // Check if source changed, marking as different if it did
                // We only do this for direct root dependencies that are compatible
                if (node.root && compatible) {
                    originalSource = ext_mout_mout.object.get(
                        local,
                        'pkgMeta._originalSource'
                    );
                    if (originalSource && originalSource !== json.source) {
                        restored.different = true;
                    }
                }
            }

            // Cross reference
            node.dependencies[key] = restored;
            processed[node.name + ':' + key] = true;

            restored.dependants = restored.dependants || {};
            restored.dependants[node.name] = ext_mout_mout.object.mixIn({}, node); // We need to clone due to shared objects in the manager!

            // Call restore for this dependency
            this._restoreNode(restored, flattened, 'dependencies', processed);

            // Do the same for the incompatible local package
            if (local && restored !== local) {
                this._restoreNode(local, flattened, 'dependencies', processed);
            }
        },
        this
    );
};

export { Project_Project as Project };
