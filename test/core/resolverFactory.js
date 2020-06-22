import ext_expect_expect from "expect.js";
import { fs as libutilfs_fsjs } from "../../lib/util/fs";
import ext_path_path from "path";
import ext_mkdirp_mkdirp from "mkdirp";
import ext_mout_mout from "mout";
import ext_q_Q from "q";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../../lib/util/rimraf";
import ext_bowerregistryclient_RegistryClient from "bower-registry-client";
import ext_bowerlogger_Logger from "bower-logger";

import {
    clearRuntimeCache as resolverFactoryjs_clearRuntimeCache,
    createInstance as libcoreresolverFactory_createInstancejs,
} from "../../lib/core/resolverFactory";

import { indexjs as libcoreindex_indexjsjs } from "../../lib/core/resolvers";
import { defaultConfig as libconfig_defaultConfigjs } from "../../lib/config";
import * as helpers_hasSvnjs from "../helpers";

describe('resolverFactory', function() {
    var tempSource;
    var logger = new ext_bowerlogger_Logger();
    var registryClient = new ext_bowerregistryclient_RegistryClient(
        libconfig_defaultConfigjs({
            cache: libconfig_defaultConfigjs()._registry
        })
    );

    afterEach(function(next) {
        logger.removeAllListeners();

        if (tempSource) {
            libutilrimraf_rimrafjsjs(tempSource, next);
            tempSource = null;
        } else {
            next();
        }
    });

    after(function(next) {
        libutilrimraf_rimrafjsjs('pure', next);
    });

    function callFactory(decEndpoint, config, skipRegistry) {
        return libcoreresolverFactory_createInstancejs(
            decEndpoint,
            { config: libconfig_defaultConfigjs(config), logger: logger },
            skipRegistry ? undefined : registryClient
        );
    }

    it('should recognize git remote endpoints correctly', function(next) {
        var promise = ext_q_Q.resolve();
        var endpoints;

        endpoints = {
            // git:
            'git://hostname.com/user/project':
                'git://hostname.com/user/project',
            'git://hostname.com/user/project/':
                'git://hostname.com/user/project',
            'git://hostname.com/user/project.git':
                'git://hostname.com/user/project.git',
            'git://hostname.com/user/project.git/':
                'git://hostname.com/user/project.git',

            // git@:
            'git@hostname.com:user/project': 'git@hostname.com:user/project',
            'git@hostname.com:user/project/': 'git@hostname.com:user/project',
            'git@hostname.com:user/project.git':
                'git@hostname.com:user/project.git',
            'git@hostname.com:user/project.git/':
                'git@hostname.com:user/project.git',

            // git+ssh:
            'git+ssh://user@hostname.com:project':
                'ssh://user@hostname.com:project',
            'git+ssh://user@hostname.com:project/':
                'ssh://user@hostname.com:project',
            'git+ssh://user@hostname.com:project.git':
                'ssh://user@hostname.com:project.git',
            'git+ssh://user@hostname.com:project.git/':
                'ssh://user@hostname.com:project.git',
            'git+ssh://user@hostname.com/project':
                'ssh://user@hostname.com/project',
            'git+ssh://user@hostname.com/project/':
                'ssh://user@hostname.com/project',
            'git+ssh://user@hostname.com/project.git':
                'ssh://user@hostname.com/project.git',
            'git+ssh://user@hostname.com/project.git/':
                'ssh://user@hostname.com/project.git',

            // git+http
            'git+http://hostname.com/project/blah':
                'http://hostname.com/project/blah',
            'git+http://hostname.com/project/blah/':
                'http://hostname.com/project/blah',
            'git+http://hostname.com/project/blah.git':
                'http://hostname.com/project/blah.git',
            'git+http://hostname.com/project/blah.git/':
                'http://hostname.com/project/blah.git',
            'git+http://user@hostname.com/project/blah':
                'http://user@hostname.com/project/blah',
            'git+http://user@hostname.com/project/blah/':
                'http://user@hostname.com/project/blah',
            'git+http://user@hostname.com/project/blah.git':
                'http://user@hostname.com/project/blah.git',
            'git+http://user@hostname.com/project/blah.git/':
                'http://user@hostname.com/project/blah.git',

            // git+https
            'git+https://hostname.com/project/blah':
                'https://hostname.com/project/blah',
            'git+https://hostname.com/project/blah/':
                'https://hostname.com/project/blah',
            'git+https://hostname.com/project/blah.git':
                'https://hostname.com/project/blah.git',
            'git+https://hostname.com/project/blah.git/':
                'https://hostname.com/project/blah.git',
            'git+https://user@hostname.com/project/blah':
                'https://user@hostname.com/project/blah',
            'git+https://user@hostname.com/project/blah/':
                'https://user@hostname.com/project/blah',
            'git+https://user@hostname.com/project/blah.git':
                'https://user@hostname.com/project/blah.git',
            'git+https://user@hostname.com/project/blah.git/':
                'https://user@hostname.com/project/blah.git',

            // ssh .git$
            'ssh://user@hostname.com:project.git':
                'ssh://user@hostname.com:project.git',
            'ssh://user@hostname.com:project.git/':
                'ssh://user@hostname.com:project.git',
            'ssh://user@hostname.com/project.git':
                'ssh://user@hostname.com/project.git',
            'ssh://user@hostname.com/project.git/':
                'ssh://user@hostname.com/project.git',

            // http .git$
            'http://hostname.com/project.git':
                'http://hostname.com/project.git',
            'http://hostname.com/project.git/':
                'http://hostname.com/project.git',
            'http://user@hostname.com/project.git':
                'http://user@hostname.com/project.git',
            'http://user@hostname.com/project.git/':
                'http://user@hostname.com/project.git',

            // https .git$
            'https://hostname.com/project.git':
                'https://hostname.com/project.git',
            'https://hostname.com/project.git/':
                'https://hostname.com/project.git',
            'https://user@hostname.com/project.git':
                'https://user@hostname.com/project.git',
            'https://user@hostname.com/project.git/':
                'https://user@hostname.com/project.git',

            // shorthand
            'bower/bower': 'https://github.com/bower/bower.git'
        };

        ext_mout_mout.object.forOwn(endpoints, function(value, key) {
            // Test without name and target
            promise = promise
                .then(function() {
                    return callFactory({ source: key });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitRemote);
                    ext_expect_expect(resolver).to.not.be(libcoreindex_indexjsjs.GitHub);
                    ext_expect_expect(resolver.getSource()).to.equal(value);
                    ext_expect_expect(resolver.getTarget()).to.equal('*');
                });

            // Test with target
            promise = promise
                .then(function() {
                    return callFactory({ source: key, target: 'commit-ish' });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitRemote);
                    ext_expect_expect(resolver).to.not.be(libcoreindex_indexjsjs.GitHub);
                    ext_expect_expect(resolver.getSource()).to.equal(value);
                    ext_expect_expect(resolver.getTarget()).to.equal('commit-ish');
                });

            // Test with name
            promise = promise
                .then(function() {
                    return callFactory({ name: 'foo', source: key });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitRemote);
                    ext_expect_expect(resolver).to.not.be(libcoreindex_indexjsjs.GitHub);
                    ext_expect_expect(resolver.getSource()).to.equal(value);
                    ext_expect_expect(resolver.getName()).to.equal('foo');
                    ext_expect_expect(resolver.getTarget()).to.equal('*');
                });
        });

        promise.then(next.bind(next, null)).done();
    });

    it('should recognize GitHub endpoints correctly', function(next) {
        var promise = ext_q_Q.resolve();
        var gitHub;
        var nonGitHub;

        gitHub = {
            // git:
            'git://github.com/user/project':
                'git://github.com/user/project.git',
            'git://github.com/user/project/':
                'git://github.com/user/project.git',
            'git://github.com/user/project.git':
                'git://github.com/user/project.git',
            'git://github.com/user/project.git/':
                'git://github.com/user/project.git',

            // git@:
            'git@github.com:user/project': 'git@github.com:user/project.git',
            'git@github.com:user/project/': 'git@github.com:user/project.git',
            'git@github.com:user/project.git':
                'git@github.com:user/project.git',
            'git@github.com:user/project.git/':
                'git@github.com:user/project.git',

            // git+ssh:
            'git+ssh://git@github.com:project/blah':
                'ssh://git@github.com:project/blah.git',
            'git+ssh://git@github.com:project/blah/':
                'ssh://git@github.com:project/blah.git',
            'git+ssh://git@github.com:project/blah.git':
                'ssh://git@github.com:project/blah.git',
            'git+ssh://git@github.com:project/blah.git/':
                'ssh://git@github.com:project/blah.git',
            'git+ssh://git@github.com/project/blah':
                'ssh://git@github.com/project/blah.git',
            'git+ssh://git@github.com/project/blah/':
                'ssh://git@github.com/project/blah.git',
            'git+ssh://git@github.com/project/blah.git':
                'ssh://git@github.com/project/blah.git',
            'git+ssh://git@github.com/project/blah.git/':
                'ssh://git@github.com/project/blah.git',

            // git+http
            'git+http://github.com/project/blah':
                'http://github.com/project/blah.git',
            'git+http://github.com/project/blah/':
                'http://github.com/project/blah.git',
            'git+http://github.com/project/blah.git':
                'http://github.com/project/blah.git',
            'git+http://github.com/project/blah.git/':
                'http://github.com/project/blah.git',
            'git+http://user@github.com/project/blah':
                'http://user@github.com/project/blah.git',
            'git+http://user@github.com/project/blah/':
                'http://user@github.com/project/blah.git',
            'git+http://user@github.com/project/blah.git':
                'http://user@github.com/project/blah.git',
            'git+http://user@github.com/project/blah.git/':
                'http://user@github.com/project/blah.git',

            // git+https
            'git+https://github.com/project/blah':
                'https://github.com/project/blah.git',
            'git+https://github.com/project/blah/':
                'https://github.com/project/blah.git',
            'git+https://github.com/project/blah.git':
                'https://github.com/project/blah.git',
            'git+https://github.com/project/blah.git/':
                'https://github.com/project/blah.git',
            'git+https://user@github.com/project/blah':
                'https://user@github.com/project/blah.git',
            'git+https://user@github.com/project/blah/':
                'https://user@github.com/project/blah.git',
            'git+https://user@github.com/project/blah.git':
                'https://user@github.com/project/blah.git',
            'git+https://user@github.com/project/blah.git/':
                'https://user@github.com/project/blah.git',

            // ssh .git$
            'ssh://git@github.com:project/blah.git':
                'ssh://git@github.com:project/blah.git',
            'ssh://git@github.com:project/blah.git/':
                'ssh://git@github.com:project/blah.git',
            'ssh://git@github.com/project/blah.git':
                'ssh://git@github.com/project/blah.git',
            'ssh://git@github.com/project/blah.git/':
                'ssh://git@github.com/project/blah.git',

            // http .git$
            'http://github.com/project/blah.git':
                'http://github.com/project/blah.git',
            'http://github.com/project/blah.git/':
                'http://github.com/project/blah.git',
            'http://user@github.com/project/blah.git':
                'http://user@github.com/project/blah.git',
            'http://user@github.com/project/blah.git/':
                'http://user@github.com/project/blah.git',

            // https
            'https://github.com/project/blah.git':
                'https://github.com/project/blah.git',
            'https://github.com/project/blah.git/':
                'https://github.com/project/blah.git',
            'https://user@github.com/project/blah.git':
                'https://user@github.com/project/blah.git',
            'https://user@github.com/project/blah.git/':
                'https://user@github.com/project/blah.git',

            // shorthand
            'bower/bower': 'https://github.com/bower/bower.git'
        };

        nonGitHub = [
            'git://github.com/user/project/bleh.git',
            'git://xxxxgithub.com/user/project.git',
            'git@xxxxgithub.com:user:project.git',
            'git@xxxxgithub.com:user/project.git',
            'git+ssh://git@xxxxgithub.com:user/project',
            'git+ssh://git@xxxxgithub.com/user/project',
            'git+http://user@xxxxgithub.com/user/project',
            'git+https://user@xxxxgithub.com/user/project',
            'ssh://git@xxxxgithub.com:user/project.git',
            'ssh://git@xxxxgithub.com/user/project.git',
            'http://xxxxgithub.com/user/project.git',
            'https://xxxxgithub.com/user/project.git',
            'http://user@xxxxgithub.com/user/project.git',
            'https://user@xxxxgithub.com/user/project.git'
        ];

        // Test GitHub ones
        ext_mout_mout.object.forOwn(gitHub, function(value, key) {
            // Test without name and target
            promise = promise
                .then(function() {
                    return callFactory({ source: key });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitHub);
                    ext_expect_expect(resolver.getSource()).to.equal(value);
                    ext_expect_expect(resolver.getTarget()).to.equal('*');
                });

            // Test with target
            promise = promise
                .then(function() {
                    return callFactory({ source: key, target: 'commit-ish' });
                })
                .then(function(resolver) {
                    if (value) {
                        ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitHub);
                        ext_expect_expect(resolver.getSource()).to.equal(value);
                        ext_expect_expect(resolver.getTarget()).to.equal('commit-ish');
                    } else {
                        ext_expect_expect(resolver).to.not.be.a(libcoreindex_indexjsjs.GitHub);
                    }
                });

            // Test with name
            promise = promise
                .then(function() {
                    return callFactory({ name: 'foo', source: key });
                })
                .then(function(resolver) {
                    if (value) {
                        ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitHub);
                        ext_expect_expect(resolver.getSource()).to.equal(value);
                        ext_expect_expect(resolver.getName()).to.equal('foo');
                        ext_expect_expect(resolver.getTarget()).to.equal('*');
                    } else {
                        ext_expect_expect(resolver).to.not.be.a(libcoreindex_indexjsjs.GitHub);
                    }
                });
        });

        // Test similar to GitHub but not real GitHub
        nonGitHub.forEach(function(value) {
            promise = promise
                .then(function() {
                    return callFactory({ source: value });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.not.be.a(libcoreindex_indexjsjs.GitHub);
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitRemote);
                });
        });

        promise.then(next.bind(next, null)).done();
    });

    it('should recognize local fs git endpoints correctly', function(next) {
        var promise = ext_q_Q.resolve();
        var endpoints;
        var temp;

        endpoints = {};

        // Absolute path
        temp = ext_path_path.resolve(__dirname, '../assets/package-a');
        endpoints[temp] = temp;

        // Absolute path that ends with a /
        // See: https://github.com/bower/bower/issues/898
        temp = ext_path_path.resolve(__dirname, '../assets/package-a') + '/';
        endpoints[temp] = temp;

        // Relative path
        endpoints[__dirname + '/../assets/package-a'] = temp;

        // TODO: test with backslashes on windows and ~/ on unix

        ext_mout_mout.object.forOwn(endpoints, function(value, key) {
            // Test without name
            promise = promise
                .then(function() {
                    return callFactory({ source: key });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitFs);
                    ext_expect_expect(resolver.getTarget()).to.equal('*');
                });

            // Test with name
            promise = promise
                .then(function() {
                    return callFactory({ name: 'foo', source: key });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitFs);
                    ext_expect_expect(resolver.getName()).to.equal('foo');
                    ext_expect_expect(resolver.getTarget()).to.equal('*');
                });
        });

        promise.then(next.bind(next, null)).done();
    });

    if (!helpers_hasSvnjs.hasSvn())
        describe.skip('should recognize svn remote endpoints correctly', function() {});
    else
        it('should recognize svn remote endpoints correctly', function(next) {
            var promise = ext_q_Q.resolve();
            var endpoints;

            endpoints = {
                // svn:
                'svn://hostname.com/user/project':
                    'http://hostname.com/user/project',
                'svn://hostname.com/user/project/':
                    'http://hostname.com/user/project',

                // svn@:
                'svn://svn@hostname.com:user/project':
                    'http://svn@hostname.com:user/project',
                'svn://svn@hostname.com:user/project/':
                    'http://svn@hostname.com:user/project',

                // svn+http
                'svn+http://hostname.com/project/blah':
                    'http://hostname.com/project/blah',
                'svn+http://hostname.com/project/blah/':
                    'http://hostname.com/project/blah',
                'svn+http://user@hostname.com/project/blah':
                    'http://user@hostname.com/project/blah',
                'svn+http://user@hostname.com/project/blah/':
                    'http://user@hostname.com/project/blah',

                // svn+https
                'svn+https://hostname.com/project/blah':
                    'https://hostname.com/project/blah',
                'svn+https://hostname.com/project/blah/':
                    'https://hostname.com/project/blah',
                'svn+https://user@hostname.com/project/blah':
                    'https://user@hostname.com/project/blah',
                'svn+https://user@hostname.com/project/blah/':
                    'https://user@hostname.com/project/blah',

                // svn+ssh
                'svn+ssh://hostname.com/project/blah':
                    'svn+ssh://hostname.com/project/blah',
                'svn+ssh://hostname.com/project/blah/':
                    'svn+ssh://hostname.com/project/blah',
                'svn+ssh://user@hostname.com/project/blah':
                    'svn+ssh://user@hostname.com/project/blah',
                'svn+ssh://user@hostname.com/project/blah/':
                    'svn+ssh://user@hostname.com/project/blah',

                // svn+file
                'svn+file:///project/blah': 'file:///project/blah',
                'svn+file:///project/blah/': 'file:///project/blah'
            };

            ext_mout_mout.object.forOwn(endpoints, function(value, key) {
                // Test without name and target
                promise = promise
                    .then(function() {
                        return callFactory({ source: key });
                    })
                    .then(function(resolver) {
                        ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Svn);
                        ext_expect_expect(resolver).to.not.be(libcoreindex_indexjsjs.GitHub);
                        ext_expect_expect(
                            libcoreindex_indexjsjs.Svn.getSource(resolver.getSource())
                        ).to.equal(value);
                        ext_expect_expect(resolver.getTarget()).to.equal('*');
                    });

                // Test with target
                promise = promise
                    .then(function() {
                        return callFactory({
                            source: key,
                            target: 'commit-ish'
                        });
                    })
                    .then(function(resolver) {
                        ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Svn);
                        ext_expect_expect(resolver).to.not.be(libcoreindex_indexjsjs.GitHub);
                        ext_expect_expect(
                            libcoreindex_indexjsjs.Svn.getSource(resolver.getSource())
                        ).to.equal(value);
                        ext_expect_expect(resolver.getTarget()).to.equal('commit-ish');
                    });

                // Test with name
                promise = promise
                    .then(function() {
                        return callFactory({ name: 'foo', source: key });
                    })
                    .then(function(resolver) {
                        ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Svn);
                        ext_expect_expect(resolver).to.not.be(libcoreindex_indexjsjs.GitHub);
                        ext_expect_expect(
                            libcoreindex_indexjsjs.Svn.getSource(resolver.getSource())
                        ).to.equal(value);
                        ext_expect_expect(resolver.getName()).to.equal('foo');
                        ext_expect_expect(resolver.getTarget()).to.equal('*');
                    });
            });

            promise.then(next.bind(next, null)).done();
        });

    it('should recognize local fs files/folder endpoints correctly', function(next) {
        var promise = ext_q_Q.resolve();
        var endpoints;
        var temp;

        tempSource = ext_path_path.resolve(__dirname, '../tmp/tmp');
        ext_mkdirp_mkdirp.sync(tempSource);
        libutilfs_fsjs.writeFileSync(ext_path_path.join(tempSource, '.git'), 'foo');
        libutilfs_fsjs.writeFileSync(
            ext_path_path.join(tempSource, 'file.with.multiple.dots'),
            'foo'
        );

        endpoints = {};

        // Absolute path to folder with .git file
        endpoints[tempSource] = tempSource;
        // Relative path to folder with .git file
        endpoints[__dirname + '/../tmp/tmp'] = tempSource;

        // Absolute path to folder
        temp = ext_path_path.resolve(__dirname, '../assets/test-temp-dir');
        endpoints[temp] = temp;
        // Absolute + relative path to folder
        endpoints[__dirname + '/../assets/test-temp-dir'] = temp;

        // Absolute path to file
        temp = ext_path_path.resolve(__dirname, '../assets/package-zip.zip');
        endpoints[temp] = temp;
        // Absolute + relative path to file
        endpoints[__dirname + '/../assets/package-zip.zip'] = temp;

        // Relative ../
        endpoints['../'] = ext_path_path.normalize(__dirname + '/../../..');

        // Relative ./
        endpoints['./test/assets'] = ext_path_path.join(__dirname, '../assets');

        // Relative with just one slash, to test fs resolution
        // priority against shorthands
        endpoints['./test'] = ext_path_path.join(__dirname, '..');

        // Test files with multiple dots (PR #474)
        temp = ext_path_path.join(tempSource, 'file.with.multiple.dots');
        endpoints[temp] = temp;

        ext_mout_mout.object.forOwn(endpoints, function(value, key) {
            // Test without name
            promise = promise
                .then(function() {
                    return callFactory({ source: key });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver.getSource()).to.equal(value);
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Fs);
                    ext_expect_expect(resolver.getTarget()).to.equal('*');
                });

            // Test with name
            promise = promise
                .then(function() {
                    return callFactory({ name: 'foo', source: key });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Fs);
                    ext_expect_expect(resolver.getName()).to.equal('foo');
                    ext_expect_expect(resolver.getTarget()).to.equal('*');
                    ext_expect_expect(resolver.getSource()).to.equal(value);
                });
        });

        promise.then(next.bind(next, null)).done();
    });

    it('should recognize URL endpoints correctly', function(next) {
        var promise = ext_q_Q.resolve();
        var endpoints;

        endpoints = ['http://bower.io/foo.js', 'https://bower.io/foo.js'];

        endpoints.forEach(function(source) {
            // Test without name
            promise = promise
                .then(function() {
                    return callFactory({ source: source });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Url);
                    ext_expect_expect(resolver.getSource()).to.equal(source);
                });

            // Test with name
            promise = promise
                .then(function() {
                    return callFactory({ name: 'foo', source: source });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Url);
                    ext_expect_expect(resolver.getName()).to.equal('foo');
                    ext_expect_expect(resolver.getSource()).to.equal(source);
                });
        });

        promise.then(next.bind(next, null)).done();
    });

    it('should recognize URL endpoints correctly', function(next) {
        var promise = ext_q_Q.resolve();
        var endpoints;

        endpoints = ['http://bower.io/foo.js', 'https://bower.io/foo.js'];

        endpoints.forEach(function(source) {
            // Test without name
            promise = promise
                .then(function() {
                    return callFactory({ source: source });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Url);
                    ext_expect_expect(resolver.getSource()).to.equal(source);
                });

            // Test with name
            promise = promise
                .then(function() {
                    return callFactory({ name: 'foo', source: source });
                })
                .then(function(resolver) {
                    ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.Url);
                    ext_expect_expect(resolver.getName()).to.equal('foo');
                    ext_expect_expect(resolver.getSource()).to.equal(source);
                });
        });

        promise.then(next.bind(next, null)).done();
    });

    it('should recognize registry endpoints correctly', function(next) {
        // Create a 'pure' file at the root to prevent regressions of #666
        libutilfs_fsjs.writeFileSync('pure', 'foo');

        callFactory({ source: 'pure' })
            .then(function(resolver) {
                ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitRemote);
                ext_expect_expect(resolver.getSource()).to.equal(
                    'https://github.com/yui/pure-release.git'
                );
                ext_expect_expect(resolver.getTarget()).to.equal('*');
            })
            .then(function() {
                // Test with name
                return callFactory({ source: 'pure', name: 'foo' }).then(
                    function(resolver) {
                        ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitRemote);
                        ext_expect_expect(resolver.getSource()).to.equal(
                            'https://github.com/yui/pure-release.git'
                        );
                        ext_expect_expect(resolver.getName()).to.equal('foo');
                        ext_expect_expect(resolver.getTarget()).to.equal('*');
                    }
                );
            })
            .then(function() {
                // Test with target
                return callFactory({ source: 'pure', target: '~0.4.0' }).then(
                    function(resolver) {
                        ext_expect_expect(resolver).to.be.a(libcoreindex_indexjsjs.GitRemote);
                        ext_expect_expect(resolver.getTarget()).to.equal('~0.4.0');

                        next();
                    }
                );
            })
            .done();
    });

    it('should error out if the package was not found in the registry', function(next) {
        callFactory({ source: 'some-package-that-will-never-exist' })
            .then(
                function() {
                    throw new Error('Should have failed');
                },
                function(err) {
                    ext_expect_expect(err).to.be.an(Error);
                    ext_expect_expect(err.code).to.equal('ENOTFOUND');
                    ext_expect_expect(err.message).to.contain(
                        'some-package-that-will-never-exist'
                    );

                    next();
                }
            )
            .done();
    });

    // it('should set registry to true on the decomposed endpoint if fetched from the registry', function (next) {
    //     var decEndpoint = { source: 'pure' };

    //     return callFactory(decEndpoint, { resolvers: ['sample-custom-resolver'] })
    //     .then(function () {
    //         next();
    //     })
    //     .done();
    // });

    it('should use the configured shorthand resolver', function(next) {
        callFactory({ source: 'bower/bower' })
            .then(function(resolver) {
                var config = {
                    shorthandResolver:
                        'https://bower.io/{{owner}}/{{package}}/{{shorthand}}'
                };

                ext_expect_expect(resolver.getSource()).to.equal(
                    'https://github.com/bower/bower.git'
                );

                return callFactory({ source: 'IndigoUnited/promptly' }, config);
            })
            .then(function(resolver) {
                ext_expect_expect(resolver.getSource()).to.equal(
                    'https://bower.io/IndigoUnited/promptly/IndigoUnited/promptly'
                );
                next();
            })
            .done();
    });

    it('should not expand using the shorthand resolver if it looks like a SSH URL', function(next) {
        callFactory({ source: 'bleh@xxx.com:foo/bar' })
            .then(
                function(resolver) {
                    throw new Error('Should have failed');
                },
                function(err) {
                    ext_expect_expect(err).to.be.an(Error);
                    ext_expect_expect(err.code).to.equal('ENOTFOUND');
                    ext_expect_expect(err.message).to.contain('bleh@xxx.com:foo/bar');
                    next();
                }
            )
            .done();
    });

    it("should error out if there's no suitable resolver for a given source", function(next) {
        callFactory(
            { source: 'some-package-that-will-never-exist' },
            undefined,
            true
        )
            .then(
                function() {
                    throw new Error('Should have failed');
                },
                function(err) {
                    ext_expect_expect(err).to.be.an(Error);
                    ext_expect_expect(err.code).to.be('ENORESOLVER');
                    ext_expect_expect(err.message).to.contain('appropriate resolver');
                    next();
                }
            )
            .done();
    });

    it.skip('should use config.cwd when resolving relative paths');

    it('should not swallow constructor errors when instantiating resolvers', function(next) {
        var promise = ext_q_Q.resolve();
        var endpoints;

        // TODO: test with others
        endpoints = [
            'http://bower.io/foo.js',
            ext_path_path.resolve(__dirname, '../assets/test-temp-dir')
        ];

        endpoints.forEach(function(source) {
            promise = promise
                .then(function() {
                    return callFactory({ source: source, target: 'bleh' });
                })
                .then(
                    function() {
                        throw new Error('Should have failed');
                    },
                    function(err) {
                        ext_expect_expect(err).to.be.an(Error);
                        ext_expect_expect(err.message).to.match(/can't resolve targets/i);
                        ext_expect_expect(err.code).to.equal('ENORESTARGET');
                    }
                );
        });

        promise.then(next.bind(next, null)).done();
    });

    describe('.clearRuntimeCache', function() {
        it('should call every resolver static method that clears the runtime cache', function() {
            var originalMethods = {};
            var called = [];
            var error;

            ext_mout_mout.object.forOwn(libcoreindex_indexjsjs, function(ConcreteResolver, key) {
                originalMethods[key] = ConcreteResolver.clearRuntimeCache;
                ConcreteResolver.clearRuntimeCache = function() {
                    called.push(key);
                    return originalMethods[key].apply(this, arguments);
                };
            });

            try {
                resolverFactoryjs_clearRuntimeCache();
            } catch (e) {
                error = e;
            } finally {
                ext_mout_mout.object.forOwn(libcoreindex_indexjsjs, function(ConcreteResolver, key) {
                    ConcreteResolver.clearRuntimeCache = originalMethods[key];
                });
            }

            if (error) {
                throw error;
            }

            ext_expect_expect(called.sort()).to.eql(Object.keys(libcoreindex_indexjsjs).sort());
        });
    });
});
