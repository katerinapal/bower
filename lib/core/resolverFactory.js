import ext_q_Q from "q";
import { fs as utilfs_fsjs } from "../util/fs";
import ext_path_path from "path";
import ext_mout_mout from "mout";
import { indexjs as index_indexjsjs } from "./resolvers";
import { createError as utilcreateError_createErrorjs } from "../util/createError";
import { resolvejs as utilresolve_resolvejsjs } from "../util/resolve";
import {     pluginResolverFactory as resolverspluginResolverFactory_pluginResolverFactoryjs, } from "./resolvers/pluginResolverFactory";
import { versionjs as version_versionjs } from "../version";
var resolverFactory_clearRuntimeCache;
var resolverFactory_getConstructor;

function createInstance(decEndpoint, options, registryClient) {
    decEndpoint = ext_mout_mout.object.pick(decEndpoint, ['name', 'target', 'source']);

    options.version = version_versionjs;

    return getConstructor(decEndpoint, options, registryClient).spread(function(
        ConcreteResolver,
        decEndpoint
    ) {
        return new ConcreteResolver(
            decEndpoint,
            options.config,
            options.logger
        );
    });
}

function getConstructor(decEndpoint, options, registryClient) {
    var source = decEndpoint.source;
    var config = options.config;

    // Below we try a series of async tests to guess the type of resolver to use
    // If a step was unable to guess the resolver, it returns undefined
    // If a step can guess the resolver, it returns with constructor of resolver

    var promise = ext_q_Q.resolve();

    var addResolver = function(resolverFactory) {
        promise = promise.then(function(result) {
            if (result === undefined) {
                return resolverFactory(decEndpoint, options);
            } else {
                return result;
            }
        });
    };

    // Plugin resolvers.
    //
    // It requires each resolver defined in config.resolvers and calls
    // its "match" to check if given resolves supports given decEndpoint
    addResolver(function() {
        var selectedResolver;
        var resolverNames;

        if (Array.isArray(config.resolvers)) {
            resolverNames = config.resolvers;
        } else if (!!config.resolvers) {
            resolverNames = config.resolvers.split(',');
        } else {
            resolverNames = [];
        }

        var resolverPromises = resolverNames.map(function(resolverName) {
            var resolver = index_indexjsjs[resolverName];

            if (resolver === undefined) {
                var resolverPath = utilresolve_resolvejsjs(resolverName, { cwd: config.cwd });

                if (resolverPath === undefined) {
                    throw utilcreateError_createErrorjs(
                        'Bower resolver not found: ' + resolverName,
                        'ENORESOLVER'
                    );
                }

                resolver = resolverspluginResolverFactory_pluginResolverFactoryjs(
                    require(resolverPath),
                    options
                );
            }

            return function() {
                if (selectedResolver === undefined) {
                    var match = resolver.match.bind(resolver);

                    return ext_q_Q.fcall(match, source).then(function(result) {
                        if (result) {
                            return (selectedResolver = resolver);
                        }
                    });
                } else {
                    return selectedResolver;
                }
            };
        });

        return resolverPromises
            .reduce(ext_q_Q.when, new ext_q_Q(undefined))
            .then(function(resolver) {
                if (resolver) {
                    return ext_q_Q.fcall(
                        resolver.locate.bind(resolver),
                        decEndpoint.source
                    ).then(function(result) {
                        if (result && result !== decEndpoint.source) {
                            decEndpoint.source = result;
                            decEndpoint.registry = true;
                            return getConstructor(
                                decEndpoint,
                                options,
                                registryClient
                            );
                        } else {
                            return [resolver, decEndpoint];
                        }
                    });
                }
            });
    });

    // Git case: git git+ssh, git+http, git+https
    //           .git at the end (probably ssh shorthand)
    //           git@ at the start
    addResolver(function() {
        if (
            /^git(\+(ssh|https?))?:\/\//i.test(source) ||
            /\.git\/?$/i.test(source) ||
            /^git@/i.test(source)
        ) {
            decEndpoint.source = source.replace(/^git\+/, '');

            // If it's a GitHub repository, return the specialized resolver
            if (index_indexjsjs.GitHub.getOrgRepoPair(source)) {
                return [index_indexjsjs.GitHub, decEndpoint];
            }

            return [index_indexjsjs.GitRemote, decEndpoint];
        }
    });

    // SVN case: svn, svn+ssh, svn+http, svn+https, svn+file
    addResolver(function() {
        if (/^svn(\+(ssh|https?|file))?:\/\//i.test(source)) {
            return [index_indexjsjs.Svn, decEndpoint];
        }
    });

    // URL case
    addResolver(function() {
        if (/^https?:\/\//i.exec(source)) {
            return [index_indexjsjs.Url, decEndpoint];
        }
    });

    // If source is ./ or ../ or an absolute path

    addResolver(function() {
        var absolutePath = ext_path_path.resolve(config.cwd, source);

        if (
            /^\.\.?[\/\\]/.test(source) ||
            /^~\//.test(source) ||
            ext_path_path.normalize(source).replace(/[\/\\]+$/, '') === absolutePath
        ) {
            return ext_q_Q.nfcall(utilfs_fsjs.stat, ext_path_path.join(absolutePath, '.git'))
                .then(function(stats) {
                    decEndpoint.source = absolutePath;

                    if (stats.isDirectory()) {
                        return ext_q_Q.resolve([index_indexjsjs.GitFs, decEndpoint]);
                    }

                    throw new Error('Not a Git repository');
                })
                // If not, check if source is a valid Subversion repository
                .fail(function() {
                    return ext_q_Q.nfcall(
                        utilfs_fsjs.stat,
                        ext_path_path.join(absolutePath, '.svn')
                    ).then(function(stats) {
                        decEndpoint.source = absolutePath;

                        if (stats.isDirectory()) {
                            return ext_q_Q.resolve([index_indexjsjs.Svn, decEndpoint]);
                        }

                        throw new Error('Not a Subversion repository');
                    });
                })
                // If not, check if source is a valid file/folder
                .fail(function() {
                    return ext_q_Q.nfcall(utilfs_fsjs.stat, absolutePath).then(function() {
                        decEndpoint.source = absolutePath;

                        return ext_q_Q.resolve([index_indexjsjs.Fs, decEndpoint]);
                    });
                });
        }
    });

    // Check if is a shorthand and expand it
    addResolver(function() {
        // Check if the shorthandResolver is falsy
        if (!config.shorthandResolver) {
            return;
        }

        // Skip ssh and/or URL with auth
        if (/[:@]/.test(source)) {
            return;
        }

        // Ensure exactly only one "/"
        var parts = source.split('/');
        if (parts.length === 2) {
            decEndpoint.source = ext_mout_mout.string.interpolate(
                config.shorthandResolver,
                {
                    shorthand: source,
                    owner: parts[0],
                    package: parts[1]
                }
            );

            return getConstructor(decEndpoint, options, registryClient);
        }
    });

    // As last resort, we try the registry
    addResolver(function() {
        if (!registryClient) {
            return;
        }

        return ext_q_Q.nfcall(
            registryClient.lookup.bind(registryClient),
            source
        ).then(function(entry) {
            if (!entry) {
                throw utilcreateError_createErrorjs(
                    'Package ' + source + ' not found',
                    'ENOTFOUND'
                );
            }

            decEndpoint.registry = true;

            if (!decEndpoint.name) {
                decEndpoint.name = decEndpoint.source;
            }

            decEndpoint.source = entry.url;

            return getConstructor(decEndpoint, options);
        });
    });

    addResolver(function() {
        throw utilcreateError_createErrorjs(
            'Could not find appropriate resolver for ' + source,
            'ENORESOLVER'
        );
    });

    return promise;
}

function clearRuntimeCache() {
    ext_mout_mout.object.values(index_indexjsjs).forEach(function(ConcreteResolver) {
        ConcreteResolver.clearRuntimeCache();
    });
}

module.exports = createInstance;
resolverFactory_getConstructor = getConstructor;;
resolverFactory_clearRuntimeCache = clearRuntimeCache;;
export { resolverFactory_clearRuntimeCache as clearRuntimeCache, createInstance };
