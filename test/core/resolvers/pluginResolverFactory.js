import ext_expect_expect from "expect.js";
import ext_path_path from "path";
import ext_bowerlogger_Logger from "bower-logger";
import { createError as libutilcreateError_createErrorjs } from "../../../lib/util/createError";
import {     pluginResolverFactory as libcoreresolverspluginResolverFactory_pluginResolverFactoryjs, } from "../../../lib/core/resolvers/pluginResolverFactory";
import { defaultConfig as libconfig_defaultConfigjs } from "../../../lib/config";
import ext_q_Q from "q";

describe('pluginResolverFactory', function() {
    var testPackage = ext_path_path.resolve(__dirname, '../../assets/package-a');
    var logger;

    before(function() {
        logger = new ext_bowerlogger_Logger();
    });

    afterEach(function() {
        logger.removeAllListeners();
    });

    var mockPluginResolver = function resolver(bower) {
        return {
            match: function(source) {
                return true;
            },

            locate: function(source) {
                return source;
            },

            releases: function(source) {
                return [
                    { target: 'v1.0.0', version: '1.0.0' },
                    { target: 'v1.0.1', version: '1.0.1' }
                ];
            },

            fetch: function(endpoint, cached) {
                if (cached && cached.version) {
                    return;
                }

                return {
                    tempPath: 'some/temp/path',
                    removeIgnores: true
                };
            }
        };
    };

    function create(decEndpoint) {
        if (typeof decEndpoint === 'string') {
            decEndpoint = { source: decEndpoint };
        }
        var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
            mockPluginResolver,
            libconfig_defaultConfigjs()
        );
        return new PluginResolver(decEndpoint);
    }

    describe('.constructor', function() {
        it('should internally add decEndpoint', function() {
            var resolver;
            resolver = create('file://' + testPackage);
            ext_expect_expect(typeof resolver._decEndpoint).to.equal('object');
            ext_expect_expect(resolver._decEndpoint.source).to.equal(
                'file://' + testPackage
            );
        });

        it('should throw when invalid resolverFactory is provided', function() {
            ext_expect_expect(function() {
                libcoreresolverspluginResolverFactory_pluginResolverFactoryjs('not-a-function', libconfig_defaultConfigjs());
            }).to.throwException(
                libutilcreateError_createErrorjs(
                    'Resolver has "string" type instead of "function" type.',
                    'ERESOLERAPI'
                )
            );
        });
    });

    describe('.getEndpoint', function() {
        it('should return endpoint', function() {
            var resolver, endPoint;
            resolver = create('file://' + testPackage);
            endPoint = resolver.getEndpoint();
            ext_expect_expect(endPoint).to.have.property('source');
            ext_expect_expect(endPoint.source).to.equal('file://' + testPackage);
            ext_expect_expect(endPoint).to.have.property('name');
            ext_expect_expect(endPoint.name).to.equal('package-a');
            ext_expect_expect(endPoint).to.have.property('target');
            ext_expect_expect(endPoint.target).to.equal('*');
        });
    });

    describe('.getSource', function() {
        it('should return endpoint', function() {
            var resolver, source;
            resolver = create('file://' + testPackage);
            source = resolver.getSource();
            ext_expect_expect(source).to.equal('file://' + testPackage);
        });
    });

    describe('.getTarget', function() {
        it('should return target', function() {
            var resolver, source;
            resolver = create({
                source: 'file://' + testPackage,
                target: 'some-target'
            });
            source = resolver.getTarget();
            ext_expect_expect(source).to.equal('some-target');
        });
        it('should return * when no target is specified', function() {
            var resolver, source;
            resolver = create('file://' + testPackage);
            source = resolver.getTarget();
            ext_expect_expect(source).to.equal('*');
        });
    });

    describe('.getName', function() {
        it('should return target', function() {});
    });

    describe('.getPkgMeta', function() {
        it('should return package meta', function() {
            var resolver, pkgMeta;
            resolver = create('file://' + testPackage);
            resolver._pkgMeta = { version: 'v1.0.1' };
            pkgMeta = resolver.getPkgMeta();
            console.log(pkgMeta);
            ext_expect_expect(pkgMeta).to.have.property('version');
            ext_expect_expect(pkgMeta.version).to.equal('v1.0.1');
        });
    });

    describe('.isCacheable', function() {
        it('should always return true', function() {
            var resolver, isCacheable;
            resolver = create('file://' + testPackage);
            isCacheable = resolver.isCacheable();
            ext_expect_expect(isCacheable).to.be.ok();
        });
    });

    describe('.hasNew', function() {
        it('should return existing hasNewPromise if its set', function() {
            var resolver;
            resolver = create('file://' + testPackage);
            resolver.hasNewPromise = ext_q_Q.fcall(function() {
                return 'some-dummy-value';
            });
            resolver.hasNew().then(function(resolvedtestValue) {
                ext_expect_expect(resolvedtestValue).to.be('some-dummy-value');
            });
        });
        it('should return target', function() {});
    });

    describe('.resolve', function() {
        it("should throw 'Resolver did not provide releases of package.'", function(next) {
            var mockPluginResolverWithEmptyReleases = function resolver(bower) {
                return {
                    match: function(source) {
                        return true;
                    },

                    releases: function(source) {
                        return null;
                    },

                    fetch: function(endpoint, cached) {
                        if (cached && cached.version) {
                            return;
                        }

                        return {
                            tempPath: '/temp/path',
                            removeIgnores: true
                        };
                    }
                };
            };

            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolverWithEmptyReleases,
                libconfig_defaultConfigjs()
            );
            var path = 'file://' + testPackage;
            var resolver = new PluginResolver(path);
            resolver.resolve().catch(function(e) {
                ext_expect_expect(e.message).to.equal(
                    'Resolver did not provide releases of package.'
                );
                next();
            });
        });

        it("should throw 'No version found that was able to satisfy *.'", function(next) {
            var mockPluginResolverWithNoMatchingTarget = function resolver(
                bower
            ) {
                return {
                    match: function(source) {
                        return true;
                    },

                    releases: function(source) {
                        return [];
                    },

                    fetch: function(endpoint, cached) {
                        if (cached && cached.version) {
                            return;
                        }

                        return {
                            tempPath: '/temp/path',
                            removeIgnores: true
                        };
                    }
                };
            };

            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolverWithNoMatchingTarget,
                libconfig_defaultConfigjs()
            );
            var path = 'file://' + testPackage;
            var resolver = new PluginResolver(path);
            resolver.resolve().catch(function(e) {
                ext_expect_expect(e.message).to.equal(
                    'No version found that was able to satisfy *'
                );
                ext_expect_expect(e.code).to.equal('ENORESTARGET');
                next();
            });
        });

        it("should throw 'Resolver does not accept version ranges'", function(next) {
            var mockPluginResolverWithInvalidTarget = function resolver(bower) {
                return {
                    match: function(source) {
                        return true;
                    },
                    releases: null,
                    fetch: function(endpoint, cached) {
                        if (cached && cached.version) {
                            return;
                        }
                        return {
                            tempPath: '/temp/path',
                            removeIgnores: true
                        };
                    }
                };
            };

            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolverWithInvalidTarget,
                libconfig_defaultConfigjs()
            );
            var path = 'file://' + testPackage;
            var resolver = new PluginResolver({
                source: path,
                target: '2.0.0'
            });
            resolver.resolve().catch(function(e) {
                ext_expect_expect(e.message).to.equal(
                    'Resolver does not accept version ranges (2.0.0)'
                );
                next();
            });
        });

        it('should throw \'Resolver does not implement the "fetch" method.\'', function(next) {
            var mockPluginResolverWithoutFetch = function resolver(bower) {
                return {
                    match: function(source) {
                        return true;
                    },
                    releases: function(source) {
                        return [
                            { target: 'v1.0.0', version: '1.0.0' },
                            { target: 'v1.0.1', version: '1.0.1' }
                        ];
                    },
                    fetch: null
                };
            };
            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolverWithoutFetch,
                libconfig_defaultConfigjs()
            );
            var path = 'file://' + testPackage;
            var resolver = new PluginResolver(path);
            resolver.resolve().catch(function(e) {
                ext_expect_expect(e.message).to.equal(
                    'Resolver does not implement the "fetch" method.'
                );
                next();
            });
        });

        it("should throw 'Resolver did not provide path to extracted contents of package'", function(next) {
            var mockPluginResolverWithoutTempPath = function resolver(bower) {
                return {
                    match: function(source) {
                        return true;
                    },

                    releases: function(source) {
                        return [
                            { target: 'v1.0.0', version: '1.0.0' },
                            { target: 'v1.0.1', version: '1.0.1' }
                        ];
                    },

                    fetch: function(endpoint, cached) {
                        if (cached && cached.version) {
                            return;
                        }

                        return {
                            tempPath: null,
                            removeIgnores: true
                        };
                    }
                };
            };
            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolverWithoutTempPath,
                libconfig_defaultConfigjs()
            );
            var path = 'file://' + testPackage;
            var resolver = new PluginResolver(path);
            resolver.resolve().catch(function(e) {
                ext_expect_expect(e.message).to.equal(
                    'Resolver did not provide path to extracted contents of package.'
                );
                next();
            });
        });
    });

    describe('.isTargetable', function() {
        it('should accept mockPluginResolverWithReleasesFn', function() {
            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolver,
                libconfig_defaultConfigjs()
            );
            ext_expect_expect(PluginResolver.isTargetable()).to.be.ok();
        });
        it('should reject mockPluginResolverWithoutReleasesFn', function() {
            var mockPluginResolverWithoutReleasesFn = function resolver(bower) {
                return {
                    match: function(source) {
                        return true;
                    },
                    locate: function(source) {
                        return source;
                    },
                    fetch: function(endpoint, cached) {
                        if (cached && cached.version) {
                            return;
                        }

                        return {
                            tempPath: 'some/tmp/path',
                            removeIgnores: true
                        };
                    }
                };
            };
            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolverWithoutReleasesFn,
                libconfig_defaultConfigjs()
            );
            ext_expect_expect(PluginResolver.isTargetable()).to.not.be.ok();
        });
    });

    describe('.clearRuntimeCache', function() {
        it('', function() {
            //Unable to test private variable `resolver`
        });
    });

    describe('.match', function() {
        it('should throw when plugin does not implement .match', function() {
            var mockPluginResolverWithoutMatch = function resolver(bower) {
                return {
                    releases: function(source) {
                        return [
                            { target: 'v1.0.0', version: '1.0.0' },
                            { target: 'v1.0.1', version: '1.0.1' }
                        ];
                    },

                    fetch: function(endpoint, cached) {
                        if (cached && cached.version) {
                            return;
                        }

                        return {
                            tempPath: 'some/temp/path',
                            removeIgnores: true
                        };
                    }
                };
            };

            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolverWithoutMatch,
                libconfig_defaultConfigjs()
            );
            var source = 'git://github.com/jquery/jquery.git';
            ext_expect_expect(function() {
                PluginResolver.match(source);
            }).to.throwException(
                libutilcreateError_createErrorjs(
                    'Resolver is missing "match"' + 'method.',
                    'ERESOLVERAPI'
                )
            );
        });

        it('should match given source', function() {
            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolver,
                libconfig_defaultConfigjs()
            );
            var source = 'git://github.com/jquery/jquery.git';
            PluginResolver.match(source).then(function(result) {
                ext_expect_expect(result).to.be.ok();
            });
        });
    });

    describe('.locate', function() {
        it('should return source when plugin does not implement .locate', function() {
            var mockPluginResolverWithoutLocate = function resolver(bower) {
                return {
                    match: function(source) {
                        return true;
                    },

                    releases: function(source) {
                        return [
                            { target: 'v1.0.0', version: '1.0.0' },
                            { target: 'v1.0.1', version: '1.0.1' }
                        ];
                    },

                    fetch: function(endpoint, cached) {
                        if (cached && cached.version) {
                            return;
                        }

                        return {
                            tempPath: '/temp/path',
                            removeIgnores: true
                        };
                    }
                };
            };

            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolverWithoutLocate,
                libconfig_defaultConfigjs()
            );
            var path = 'file://' + testPackage;
            ext_expect_expect(PluginResolver.locate(path)).to.be(path);
        });

        it('should locate the source', function() {
            var PluginResolver = libcoreresolverspluginResolverFactory_pluginResolverFactoryjs(
                mockPluginResolver,
                libconfig_defaultConfigjs()
            );
            var source = 'jquery/jquery';
            PluginResolver.locate(source).then(function(result) {
                ext_expect_expect(result).to.be(source);
            });
        });
    });
});
