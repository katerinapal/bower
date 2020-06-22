import ext_expect_expect from "expect.js";
import ext_q_Q from "q";
import ext_path_path from "path";
import ext_mout_mout from "mout";
import { fs as libutilfs_fsjs } from "../../lib/util/fs";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../../lib/util/rimraf";
import ext_bowerregistryclient_RegistryClient from "bower-registry-client";
import ext_bowerlogger_Logger from "bower-logger";
import ext_proxyquire_proxyquire from "proxyquire";
import { defaultConfig as libconfig_defaultConfigjs } from "../../lib/config";
import { ResolveCache as libcoreResolveCache_ResolveCachejs } from "../../lib/core/ResolveCache";
import { indexjs as libcoreindex_indexjsjs } from "../../lib/core/resolvers";
import { copyDir as libutilcopy_copyDirjs } from "../../lib/util/copy";
import * as helpers_localSourcejs from "../helpers";

describe('PackageRepository', function() {
    var packageRepository;
    var resolver;
    var resolverFactoryHook;
    var resolverFactoryClearHook;
    var testPackage = ext_path_path.resolve(__dirname, '../assets/package-a');
    var tempPackage = ext_path_path.resolve(__dirname, '../tmp/temp-package');
    var packagesCacheDir = ext_path_path.join(__dirname, '../tmp/temp-resolve-cache');
    var registryCacheDir = ext_path_path.join(__dirname, '../tmp/temp-registry-cache');
    var mockSource = helpers_localSourcejs.localSource(testPackage);

    var forceCaching = true;

    after(function() {
        libutilrimraf_rimrafjsjs.sync(registryCacheDir);
        libutilrimraf_rimrafjsjs.sync(packagesCacheDir);
    });

    beforeEach(function(next) {
        var PackageRepository;
        var config;
        var logger = new ext_bowerlogger_Logger();

        // Config
        config = libconfig_defaultConfigjs({
            storage: {
                packages: packagesCacheDir,
                registry: registryCacheDir
            }
        });

        // Mock the resolver factory to always return a resolver for the test package
        function resolverFactory(decEndpoint, options, _registryClient) {
            var _config = options.config;
            var _logger = options.logger;

            ext_expect_expect(_config).to.eql(config);
            ext_expect_expect(_logger).to.be.an(ext_bowerlogger_Logger);
            ext_expect_expect(_registryClient).to.be.an(ext_bowerregistryclient_RegistryClient);

            decEndpoint = ext_mout_mout.object.deepMixIn({}, decEndpoint);
            decEndpoint.source = mockSource;

            resolver = new libcoreindex_indexjsjs.GitRemote(decEndpoint, _config, _logger);

            if (forceCaching) {
                // Force to use cache even for local resources
                resolver.isCacheable = function() {
                    return true;
                };
            }

            resolverFactoryHook(resolver);

            return ext_q_Q.resolve(resolver);
        }
        resolverFactory.getConstructor = function() {
            return ext_q_Q.resolve([
                libcoreindex_indexjsjs.GitRemote,
                {
                    source: helpers_localSourcejs.localSource(testPackage)
                }
            ]);
        };
        resolverFactory.clearRuntimeCache = function() {
            resolverFactoryClearHook();
        };

        PackageRepository = ext_proxyquire_proxyquire('../../lib/core/PackageRepository', {
            './resolverFactory': resolverFactory
        });
        packageRepository = new PackageRepository(config, logger);

        // Reset hooks
        resolverFactoryHook = resolverFactoryClearHook = function() {};

        // Remove temp package
        libutilrimraf_rimrafjsjs.sync(tempPackage);

        // Clear the repository
        packageRepository.clear().then(next.bind(next, null), next);
    });

    describe('.constructor', function() {
        it('should pass the config correctly to the registry client, including its cache folder', function() {
            ext_expect_expect(packageRepository._registryClient._config.cache).to.equal(
                registryCacheDir
            );
        });
    });

    describe('.fetch', function() {
        it('should call the resolver factory to get the appropriate resolver', function(next) {
            var called;

            resolverFactoryHook = function() {
                called = true;
            };

            packageRepository
                .fetch({ name: '', source: 'foo', target: '~0.1.0' })
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(called).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(canonicalDir)).to.be(true);
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.name).to.be('package-a');
                    ext_expect_expect(pkgMeta.version).to.be('0.1.1');
                    next();
                })
                .done();
        });

        it('should just call the resolver resolve method if force was specified', function(next) {
            var called = [];

            resolverFactoryHook = function(resolver) {
                var originalResolve = resolver.resolve;

                resolver.resolve = function() {
                    called.push('resolve');
                    return originalResolve.apply(this, arguments);
                };

                resolver.hasNew = function() {
                    called.push('hasNew');
                    return ext_q_Q.resolve(false);
                };
            };

            packageRepository._resolveCache.retrieve = function() {
                called.push('retrieve');
                return ext_q_Q.resolve([]);
            };

            packageRepository._config.force = true;
            packageRepository
                .fetch({ name: '', source: 'foo', target: ' ~0.1.0' })
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(called).to.eql(['resolve']);
                    ext_expect_expect(libutilfs_fsjs.existsSync(canonicalDir)).to.be(true);
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.name).to.be('package-a');
                    ext_expect_expect(pkgMeta.version).to.be('0.1.1');
                    next();
                })
                .done();
        });

        it('should attempt to retrieve a resolved package from the resolve package', function(next) {
            var called = false;
            var originalRetrieve = packageRepository._resolveCache.retrieve;

            packageRepository._resolveCache.retrieve = function(source) {
                called = true;
                ext_expect_expect(source).to.be(mockSource);
                return originalRetrieve.apply(this, arguments);
            };

            packageRepository
                .fetch({ name: '', source: 'foo', target: '~0.1.0' })
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(called).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(canonicalDir)).to.be(true);
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.name).to.be('package-a');
                    ext_expect_expect(pkgMeta.version).to.be('0.1.1');
                    next();
                })
                .done();
        });

        it('should avoid using cache for local resources', function(next) {
            forceCaching = false;

            var called = false;
            var originalRetrieve = packageRepository._resolveCache.retrieve;

            packageRepository._resolveCache.retrieve = function(source) {
                called = true;
                ext_expect_expect(source).to.be(mockSource);
                return originalRetrieve.apply(this, arguments);
            };

            packageRepository
                .fetch({
                    name: '',
                    source: helpers_localSourcejs.localSource(testPackage),
                    target: '~0.1.0'
                })
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(called).to.be(false);
                    ext_expect_expect(libutilfs_fsjs.existsSync(canonicalDir)).to.be(true);
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.name).to.be('package-a');
                    ext_expect_expect(pkgMeta.version).to.be('0.1.1');
                    forceCaching = true;
                    next();
                })
                .done();
        });

        it('should just call the resolver resolve method if no appropriate package was found in the resolve cache', function(next) {
            var called = [];

            resolverFactoryHook = function(resolver) {
                var originalResolve = resolver.resolve;

                resolver.resolve = function() {
                    called.push('resolve');
                    return originalResolve.apply(this, arguments);
                };

                resolver.hasNew = function() {
                    called.push('hasNew');
                };
            };

            packageRepository._resolveCache.retrieve = function() {
                return ext_q_Q.resolve([]);
            };

            packageRepository
                .fetch({ name: '', source: 'foo', target: ' ~0.1.0' })
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(called).to.eql(['resolve']);
                    ext_expect_expect(libutilfs_fsjs.existsSync(canonicalDir)).to.be(true);
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.name).to.be('package-a');
                    ext_expect_expect(pkgMeta.version).to.be('0.1.1');
                    next();
                })
                .done();
        });

        it('should call the resolver hasNew method if an appropriate package was found in the resolve cache', function(next) {
            var json = {
                name: 'a',
                version: '0.2.1'
            };
            var called;

            resolverFactoryHook = function(resolver) {
                var originalHasNew = resolver.hasNew;

                resolver.hasNew = function(pkgMeta) {
                    ext_expect_expect(pkgMeta).to.eql(json);
                    called = true;
                    return originalHasNew.apply(this, arguments);
                };
            };

            packageRepository._resolveCache.retrieve = function() {
                return ext_q_Q.resolve([tempPackage, json]);
            };

            libutilcopy_copyDirjs(testPackage, tempPackage, { ignore: ['.git'] })
                .then(function() {
                    libutilfs_fsjs.writeFileSync(
                        ext_path_path.join(tempPackage, '.bower.json'),
                        JSON.stringify(json)
                    );

                    return packageRepository
                        .fetch({ name: '', source: 'foo', target: '~0.1.0' })
                        .spread(function(canonicalDir, pkgMeta) {
                            ext_expect_expect(called).to.be(true);
                            ext_expect_expect(libutilfs_fsjs.existsSync(canonicalDir)).to.be(true);
                            ext_expect_expect(pkgMeta).to.be.an('object');
                            ext_expect_expect(pkgMeta.name).to.be('package-a');
                            ext_expect_expect(pkgMeta.version).to.be('0.1.1');
                            next();
                        });
                })
                .done();
        });

        it('should call the resolver resolve method if hasNew resolved to true', function(next) {
            var json = {
                name: 'a',
                version: '0.2.0'
            };
            var called = [];

            resolverFactoryHook = function(resolver) {
                var originalResolve = resolver.resolve;

                resolver.resolve = function() {
                    called.push('resolve');
                    return originalResolve.apply(this, arguments);
                };

                resolver.hasNew = function(pkgMeta) {
                    ext_expect_expect(pkgMeta).to.eql(json);
                    called.push('hasNew');
                    return ext_q_Q.resolve(true);
                };
            };

            packageRepository._resolveCache.retrieve = function() {
                return ext_q_Q.resolve([tempPackage, json]);
            };

            libutilcopy_copyDirjs(testPackage, tempPackage, { ignore: ['.git'] })
                .then(function() {
                    libutilfs_fsjs.writeFileSync(
                        ext_path_path.join(tempPackage, '.bower.json'),
                        JSON.stringify(json)
                    );

                    return packageRepository
                        .fetch({ name: '', source: 'foo', target: '~0.2.0' })
                        .spread(function(canonicalDir, pkgMeta) {
                            ext_expect_expect(called).to.eql(['hasNew', 'resolve']);
                            ext_expect_expect(libutilfs_fsjs.existsSync(canonicalDir)).to.be(true);
                            ext_expect_expect(pkgMeta).to.be.an('object');
                            ext_expect_expect(pkgMeta.name).to.be('a');
                            ext_expect_expect(pkgMeta.version).to.be('0.2.2');
                            next();
                        });
                })
                .done();
        });

        it('should resolve to the cached package if hasNew resolve to false', function(next) {
            var json = {
                name: 'a',
                version: '0.2.0'
            };
            var called = [];

            resolverFactoryHook = function(resolver) {
                var originalResolve = resolver.resolve;

                resolver.resolve = function() {
                    called.push('resolve');
                    return originalResolve.apply(this, arguments);
                };

                resolver.hasNew = function(pkgMeta) {
                    ext_expect_expect(pkgMeta).to.eql(json);
                    called.push('hasNew');
                    return ext_q_Q.resolve(false);
                };
            };

            packageRepository._resolveCache.retrieve = function() {
                return ext_q_Q.resolve([tempPackage, json]);
            };

            libutilcopy_copyDirjs(testPackage, tempPackage, { ignore: ['.git'] })
                .then(function() {
                    libutilfs_fsjs.writeFileSync(
                        ext_path_path.join(tempPackage, '.bower.json'),
                        JSON.stringify(json)
                    );

                    return packageRepository
                        .fetch({ name: '', source: 'foo', target: '~0.2.0' })
                        .spread(function(canonicalDir, pkgMeta) {
                            ext_expect_expect(called).to.eql(['hasNew']);
                            ext_expect_expect(canonicalDir).to.equal(tempPackage);
                            ext_expect_expect(pkgMeta).to.eql(json);
                            next();
                        });
                })
                .done();
        });

        it('should just use the cached package if offline was specified', function(next) {
            var json = {
                name: 'a',
                version: '0.2.0'
            };
            var called = [];

            resolverFactoryHook = function(resolver) {
                var originalResolve = resolver.resolve;

                resolver.hasNew = function(pkgMeta) {
                    ext_expect_expect(pkgMeta).to.eql(json);
                    called.push('resolve');
                    return originalResolve.apply(this, arguments);
                };

                resolver.hasNew = function() {
                    called.push('hasNew');
                    return ext_q_Q.resolve(false);
                };
            };

            packageRepository._resolveCache.retrieve = function() {
                return ext_q_Q.resolve([tempPackage, json]);
            };

            libutilcopy_copyDirjs(testPackage, tempPackage, { ignore: ['.git'] })
                .then(function() {
                    libutilfs_fsjs.writeFileSync(
                        ext_path_path.join(tempPackage, '.bower.json'),
                        JSON.stringify(json)
                    );

                    packageRepository._config.offline = true;
                    return packageRepository
                        .fetch({ name: '', source: 'foo', target: '~0.2.0' })
                        .spread(function(canonicalDir, pkgMeta) {
                            ext_expect_expect(called.length).to.be(0);
                            ext_expect_expect(canonicalDir).to.equal(tempPackage);
                            ext_expect_expect(pkgMeta).to.eql(json);
                            next();
                        });
                })
                .done();
        });

        it('should error out if there is no appropriate package in the resolve cache and offline was specified', function(next) {
            packageRepository._config.offline = true;
            packageRepository
                .fetch({ name: '', source: 'foo', target: '~0.2.0' })
                .then(
                    function() {
                        throw new Error('Should have failed');
                    },
                    function(err) {
                        ext_expect_expect(err).to.be.an(Error);
                        ext_expect_expect(err.code).to.equal('ENOCACHE');

                        next();
                    }
                )
                .done();
        });
    });

    describe('.versions', function() {
        it('should call the versions method on the concrete resolver', function(next) {
            var called = [];
            var originalVersions = libcoreindex_indexjsjs.GitRemote.versions;

            libcoreindex_indexjsjs.GitRemote.versions = function(source) {
                ext_expect_expect(source).to.equal(mockSource);
                called.push('resolver');
                return ext_q_Q.resolve([]);
            };

            packageRepository._resolveCache.versions = function() {
                called.push('resolve-cache');
                return ext_q_Q.resolve([]);
            };

            packageRepository
                .versions('foo')
                .then(function(versions) {
                    ext_expect_expect(called).to.eql(['resolver']);
                    ext_expect_expect(versions).to.be.an('array');
                    ext_expect_expect(versions.length).to.be(0);

                    next();
                })
                .fin(function() {
                    libcoreindex_indexjsjs.GitRemote.versions = originalVersions;
                })
                .done();
        });

        it('should call the versions method on the resolve cache if offline was specified', function(next) {
            var called = [];
            var originalVersions = libcoreindex_indexjsjs.GitRemote.versions;

            libcoreindex_indexjsjs.GitRemote.versions = function() {
                called.push('resolver');
                return ext_q_Q.resolve([]);
            };

            packageRepository._resolveCache.versions = function(source) {
                ext_expect_expect(source).to.equal(mockSource);
                called.push('resolve-cache');
                return ext_q_Q.resolve([]);
            };

            packageRepository._config.offline = true;
            packageRepository
                .versions('foo')
                .then(function(versions) {
                    ext_expect_expect(called).to.eql(['resolve-cache']);
                    ext_expect_expect(versions).to.be.an('array');
                    ext_expect_expect(versions.length).to.be(0);

                    next();
                })
                .fin(function() {
                    libcoreindex_indexjsjs.GitRemote.versions = originalVersions;
                })
                .done();
        });
    });

    describe('.eliminate', function() {
        it('should call the eliminate method from the resolve cache', function(next) {
            var called;
            var json = {
                name: 'a',
                version: '0.2.0',
                _source: 'foo'
            };

            packageRepository._resolveCache.eliminate = function(pkgMeta) {
                ext_expect_expect(pkgMeta).to.eql(json);
                called = true;
                return ext_q_Q.resolve();
            };

            packageRepository
                .eliminate(json)
                .then(function() {
                    ext_expect_expect(called).to.be(true);
                    next();
                })
                .done();
        });

        it('should call the clearCache method with the name from the registry client', function(next) {
            var called;
            var json = {
                name: 'a',
                version: '0.2.0',
                _source: 'foo'
            };

            packageRepository._registryClient.clearCache = function(
                name,
                callback
            ) {
                ext_expect_expect(name).to.eql(json.name);
                called = true;
                callback();
            };

            packageRepository
                .eliminate(json)
                .then(function() {
                    ext_expect_expect(called).to.be(true);
                    next();
                })
                .done();
        });
    });

    describe('.list', function() {
        it('should proxy to the resolve cache list method', function(next) {
            var called;
            var originalList = packageRepository._resolveCache.list;

            packageRepository._resolveCache.list = function() {
                called = true;
                return originalList.apply(this, arguments);
            };

            packageRepository
                .list()
                .then(function(entries) {
                    ext_expect_expect(called).to.be(true);
                    ext_expect_expect(entries).to.be.an('array');
                    next();
                })
                .done();
        });
    });

    describe('.clear', function() {
        it('should call the clear method from the resolve cache', function(next) {
            var called;

            packageRepository._resolveCache.clear = function() {
                called = true;
                return ext_q_Q.resolve();
            };

            packageRepository
                .clear()
                .then(function() {
                    ext_expect_expect(called).to.be(true);
                    next();
                })
                .done();
        });

        it('should call the clearCache method without name from the registry client', function(next) {
            var called;

            packageRepository._registryClient.clearCache = function(callback) {
                called = true;
                callback();
            };

            packageRepository
                .clear()
                .then(function() {
                    ext_expect_expect(called).to.be(true);
                    next();
                })
                .done();
        });
    });

    describe('.reset', function() {
        it('should call the reset method from the resolve cache', function() {
            var called;

            packageRepository._resolveCache.reset = function() {
                called = true;
                return packageRepository._resolveCache;
            };

            packageRepository.reset();
            ext_expect_expect(called).to.be(true);
        });

        it('should call the resetCache method without name from the registry client', function() {
            var called;

            packageRepository._registryClient.resetCache = function() {
                called = true;
                return packageRepository._registryClient;
            };

            packageRepository.reset();
            ext_expect_expect(called).to.be(true);
        });
    });

    describe('.getRegistryClient', function() {
        it('should return the underlying registry client', function() {
            ext_expect_expect(packageRepository.getRegistryClient()).to.be.an(
                ext_bowerregistryclient_RegistryClient
            );
        });
    });

    describe('.getResolveCache', function() {
        it('should return the underlying resolve cache', function() {
            ext_expect_expect(packageRepository.getResolveCache()).to.be.an(libcoreResolveCache_ResolveCachejs);
        });
    });

    describe('#clearRuntimeCache', function() {
        it('should clear the resolve cache runtime cache', function() {
            var called;
            var originalClearRuntimeCache = libcoreResolveCache_ResolveCachejs.clearRuntimeCache;

            // No need to restore the original method since the constructor
            // gets re-assigned every time in beforeEach
            libcoreResolveCache_ResolveCachejs.clearRuntimeCache = function() {
                called = true;
                return originalClearRuntimeCache.apply(libcoreResolveCache_ResolveCachejs, arguments);
            };

            packageRepository.constructor.clearRuntimeCache();
            ext_expect_expect(called).to.be(true);
        });

        it('should clear the resolver factory runtime cache', function() {
            var called;

            resolverFactoryClearHook = function() {
                called = true;
            };

            packageRepository.constructor.clearRuntimeCache();
            ext_expect_expect(called).to.be(true);
        });

        it('should clear the registry runtime cache', function() {
            var called;
            var originalClearRuntimeCache = ext_bowerregistryclient_RegistryClient.clearRuntimeCache;

            // No need to restore the original method since the constructor
            // gets re-assigned every time in beforeEach
            ext_bowerregistryclient_RegistryClient.clearRuntimeCache = function() {
                called = true;
                return originalClearRuntimeCache.apply(
                    ext_bowerregistryclient_RegistryClient,
                    arguments
                );
            };

            packageRepository.constructor.clearRuntimeCache();
            ext_expect_expect(called).to.be(true);
        });
    });
});
