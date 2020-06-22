import ext_path_path from "path";
import ext_mout_mout from "mout";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../../lib/util/rimraf";
import { fs as libutilfs_fsjs } from "../../lib/util/fs";
import ext_q_Q from "q";
import ext_expect_expect from "expect.js";
import ext_mkdirp_mkdirp from "mkdirp";
import ext_md5hex_md5 from "md5-hex";
import { ResolveCache as libcoreResolveCache_ResolveCachejs } from "../../lib/core/ResolveCache";
import { defaultConfig as libconfig_defaultConfigjs } from "../../lib/config";
import { cmd as libutilcmd_cmdjs } from "../../lib/util/cmd";
import * as libutilcopy_copyjsjs from "../../lib/util/copy";

describe('ResolveCache', function() {
    var resolveCache;
    var testPackage = ext_path_path.resolve(__dirname, '../assets/package-a');
    var tempPackage = ext_path_path.resolve(__dirname, '../tmp/temp-package');
    var tempPackage2 = ext_path_path.resolve(__dirname, '../tmp/temp2-package');
    var cacheDir = ext_path_path.join(__dirname, '../tmp/temp-resolve-cache');

    before(function(next) {
        // Delete cache folder
        libutilrimraf_rimrafjsjs.sync(cacheDir);

        // Instantiate resolver cache
        resolveCache = new libcoreResolveCache_ResolveCachejs(
            libconfig_defaultConfigjs({
                storage: {
                    packages: cacheDir
                }
            })
        );

        // Checkout test package version 0.2.0
        libutilcmd_cmdjs('git', ['checkout', '0.2.0'], { cwd: testPackage }).then(
            next.bind(next, null),
            next
        );
    });

    beforeEach(function() {
        // Reset in memory cache for each test
        resolveCache.reset();
    });

    after(function() {
        // Remove cache folder afterwards
        libutilrimraf_rimrafjsjs.sync(cacheDir);
    });

    describe('.constructor', function() {
        beforeEach(function() {
            // Delete temp folder
            libutilrimraf_rimrafjsjs.sync(tempPackage);
        });
        after(function() {
            // Delete temp folder
            libutilrimraf_rimrafjsjs.sync(tempPackage);
        });

        function initialize(cacheDir) {
            return new libcoreResolveCache_ResolveCachejs(
                libconfig_defaultConfigjs({
                    storage: {
                        packages: cacheDir
                    }
                })
            );
        }

        it("should create the cache folder if it doesn't exists", function() {
            initialize(tempPackage);
            ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage)).to.be(true);
        });

        it('should not error out if the cache folder already exists', function() {
            ext_mkdirp_mkdirp.sync(tempPackage);
            initialize(tempPackage);
        });
    });

    describe('.store', function() {
        var oldFsRename = libutilfs_fsjs.rename;

        beforeEach(function(next) {
            // Restore oldFsRename
            libutilfs_fsjs.rename = oldFsRename;

            // Create a fresh copy of the test package into temp
            libutilrimraf_rimrafjsjs.sync(tempPackage);
            libutilcopy_copyjsjs
                .copyDir(testPackage, tempPackage, { ignore: ['.git'] })
                .then(next.bind(next, null), next);
        });

        it('should move the canonical dir to source-md5/version/ folder if package meta has a version', function(next) {
            resolveCache
                .store(tempPackage, {
                    name: 'foo',
                    version: '1.0.0',
                    _source: 'foo',
                    _target: '*'
                })
                .then(function(dir) {
                    ext_expect_expect(dir).to.equal(
                        ext_path_path.join(cacheDir, ext_md5hex_md5('foo'), '1.0.0')
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(dir)).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage)).to.be(false);

                    next();
                })
                .done();
        });

        it('should move the canonical dir to source-md5/target/ folder if package meta has no version', function(next) {
            resolveCache
                .store(tempPackage, {
                    name: 'foo',
                    _source: 'foo',
                    _target: 'some-branch'
                })
                .then(function(dir) {
                    ext_expect_expect(dir).to.equal(
                        ext_path_path.join(cacheDir, ext_md5hex_md5('foo'), 'some-branch')
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(dir)).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage)).to.be(false);

                    next();
                })
                .done();
        });

        it('should move the canonical dir to source-md5/_wildcard/ folder if package meta has no version and target is *', function(next) {
            resolveCache
                .store(tempPackage, {
                    name: 'foo',
                    _source: 'foo',
                    _target: '*'
                })
                .then(function(dir) {
                    ext_expect_expect(dir).to.equal(
                        ext_path_path.join(cacheDir, ext_md5hex_md5('foo'), '_wildcard')
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(dir)).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage)).to.be(false);

                    next();
                })
                .done();
        });

        it('should read the package meta if not present', function(next) {
            var pkgMeta = ext_path_path.join(tempPackage, '.bower.json');

            // Copy bower.json to .bower.json and add some props
            libutilcopy_copyjsjs
                .copyFile(ext_path_path.join(tempPackage, 'component.json'), pkgMeta)
                .then(function() {
                    return ext_q_Q.nfcall(libutilfs_fsjs.readFile, pkgMeta).then(function(
                        contents
                    ) {
                        var json = JSON.parse(contents.toString());

                        json._target = '~0.2.0';
                        json._source =
                            'git://github.com/bower/test-package.git';

                        return ext_q_Q.nfcall(
                            libutilfs_fsjs.writeFile,
                            pkgMeta,
                            JSON.stringify(json, null, '  ')
                        );
                    });
                })
                // Store as usual
                .then(function() {
                    return resolveCache.store(tempPackage);
                })
                .then(function(dir) {
                    ext_expect_expect(dir).to.equal(
                        ext_path_path.join(
                            cacheDir,
                            ext_md5hex_md5('git://github.com/bower/test-package.git'),
                            '0.2.0'
                        )
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(dir)).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage)).to.be(false);

                    next();
                })
                .done();
        });

        it('should error out when reading the package meta if the file does not exist', function(next) {
            resolveCache
                .store(tempPackage)
                .then(
                    function() {
                        next(new Error('Should have failed'));
                    },
                    function(err) {
                        ext_expect_expect(err).to.be.an(Error);
                        ext_expect_expect(err.code).to.equal('ENOENT');
                        ext_expect_expect(err.message).to.contain(
                            ext_path_path.join(tempPackage, '.bower.json')
                        );

                        next();
                    }
                )
                .done();
        });

        it('should error out when reading an invalid package meta', function(next) {
            var pkgMeta = ext_path_path.join(tempPackage, '.bower.json');

            return ext_q_Q.nfcall(libutilfs_fsjs.writeFile, pkgMeta, 'w00t')
                .then(function() {
                    return resolveCache.store(tempPackage).then(
                        function() {
                            next(new Error('Should have failed'));
                        },
                        function(err) {
                            ext_expect_expect(err).to.be.an(Error);
                            ext_expect_expect(err.code).to.equal('EMALFORMED');
                            ext_expect_expect(err.message).to.contain(
                                ext_path_path.join(tempPackage, '.bower.json')
                            );

                            next();
                        }
                    );
                })
                .done();
        });

        it('should move the canonical dir, even if it is in a different drive', function(next) {
            var hittedMock = false;

            libutilfs_fsjs.rename = function(src, dest, cb) {
                hittedMock = true;

                setTimeout(function() {
                    var err = new Error();
                    err.code = 'EXDEV';
                    cb(err);
                }, 10);
            };

            resolveCache
                .store(tempPackage, {
                    name: 'foo',
                    _source: 'foobar',
                    _target: 'some-branch'
                })
                .then(function(dir) {
                    // Ensure mock was called
                    ext_expect_expect(hittedMock).to.be(true);

                    ext_expect_expect(dir).to.equal(
                        ext_path_path.join(cacheDir, ext_md5hex_md5('foobar'), 'some-branch')
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(dir)).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage)).to.be(false);

                    next();
                })
                .done();
        });

        it('should update the in-memory cache', function(next) {
            // Feed the cache
            resolveCache
                .versions('test-in-memory')
                // Copy temp package to temp package  2
                .then(function() {
                    return libutilcopy_copyjsjs.copyDir(tempPackage, tempPackage2, {
                        ignore: ['.git']
                    });
                })
                // Store the two packages
                .then(function() {
                    return resolveCache.store(tempPackage, {
                        name: 'foo',
                        version: '1.0.0',
                        _source: 'test-in-memory',
                        _target: '*'
                    });
                })
                .then(function() {
                    return resolveCache.store(tempPackage2, {
                        name: 'foo',
                        version: '1.0.1',
                        _source: 'test-in-memory',
                        _target: '*'
                    });
                })
                // Cache should have been updated
                .then(function() {
                    return resolveCache
                        .versions('test-in-memory')
                        .then(function(versions) {
                            ext_expect_expect(versions).to.eql(['1.0.1', '1.0.0']);

                            next();
                        });
                })
                .done();
        });

        it('should url encode target when storing to the fs', function(next) {
            resolveCache
                .store(tempPackage, {
                    name: 'foo',
                    _source: 'foo',
                    _target: 'foo/bar'
                })
                .then(function(dir) {
                    ext_expect_expect(dir).to.equal(
                        ext_path_path.join(cacheDir, ext_md5hex_md5('foo'), 'foo%2Fbar')
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(dir)).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage)).to.be(false);

                    next();
                })
                .done();
        });

        it('should be possible to store two package at same time', function(next) {
            var store = resolveCache.store.bind(resolveCache, tempPackage, {
                name: 'foo',
                _source: 'foo',
                _target: 'foo/bar'
            });
            var store2 = resolveCache.store.bind(resolveCache, tempPackage2, {
                name: 'foo',
                _source: 'foo',
                _target: 'foo/bar'
            });

            ext_q_Q.all([store(), store2()])
                .then(function(dirs) {
                    var dir = dirs[0];
                    ext_expect_expect(dir).to.equal(
                        ext_path_path.join(cacheDir, ext_md5hex_md5('foo'), 'foo%2Fbar')
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(dir)).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage)).to.be(false);
                    ext_expect_expect(libutilfs_fsjs.existsSync(tempPackage2)).to.be(false);

                    next();
                })
                .done();
        });
    });

    describe('.versions', function() {
        it('should resolve to an array', function(next) {
            resolveCache
                .versions(String(Math.random()))
                .then(function(versions) {
                    ext_expect_expect(versions).to.be.an('array');
                    next();
                })
                .done();
        });

        it('should ignore non-semver folders of the source', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, 'foo'));

            resolveCache
                .versions(source)
                .then(function(versions) {
                    ext_expect_expect(versions).to.not.contain('foo');
                    ext_expect_expect(versions).to.contain('0.0.1');
                    ext_expect_expect(versions).to.contain('0.1.0');
                    next();
                })
                .done();
        });

        it('should order the versions', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0-rc.1'));

            resolveCache
                .versions(source)
                .then(function(versions) {
                    ext_expect_expect(versions).to.eql(['0.1.0', '0.1.0-rc.1', '0.0.1']);
                    next();
                })
                .done();
        });

        it('should cache versions to speed-up subsequent calls', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));

            resolveCache
                .versions(source)
                .then(function() {
                    // Remove folder
                    libutilrimraf_rimrafjsjs.sync(sourceDir);

                    return resolveCache.versions(source);
                })
                .then(function(versions) {
                    ext_expect_expect(versions).to.eql(['0.0.1']);
                    next();
                })
                .done();
        });
    });

    describe('.retrieve', function() {
        it('should resolve to empty if there are no packages for the requested source', function(next) {
            resolveCache
                .retrieve(String(Math.random()))
                .spread(function() {
                    ext_expect_expect(arguments.length).to.equal(0);
                    next();
                })
                .done();
        });

        it('should resolve to empty if there are no suitable packages for the requested target', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.9'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.2.0'));

            resolveCache
                .retrieve(source, '~0.3.0')
                .spread(function() {
                    ext_expect_expect(arguments.length).to.equal(0);

                    return resolveCache.retrieve(source, 'some-branch');
                })
                .spread(function() {
                    ext_expect_expect(arguments.length).to.equal(0);

                    next();
                })
                .done();
        });

        it('should remove invalid packages from the cache if their package meta is missing or invalid', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.9'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.2.0'));

            // Create an invalid package meta
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.2.0', '.bower.json'),
                'w00t'
            );

            resolveCache
                .retrieve(source, '~0.1.0')
                .spread(function() {
                    var dirs = libutilfs_fsjs.readdirSync(sourceDir);

                    ext_expect_expect(arguments.length).to.equal(0);
                    ext_expect_expect(dirs).to.contain('0.0.1');
                    ext_expect_expect(dirs).to.contain('0.2.0');
                    next();
                })
                .done();
        });

        it('should resolve to the highest package that matches a range target, ignoring pre-releases', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);
            var json = { name: 'foo' };

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);

            json.version = '0.0.1';
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.0.1', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            json.version = '0.1.0';
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.1.0', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            json.version = '0.1.0-rc.1';
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0-rc.1'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.1.0-rc.1', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            json.version = '0.1.9';
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.9'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.1.9', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            json.version = '0.2.0';
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.2.0'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.2.0', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            resolveCache
                .retrieve(source, '~0.1.0')
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.version).to.equal('0.1.9');
                    ext_expect_expect(canonicalDir).to.equal(
                        ext_path_path.join(sourceDir, '0.1.9')
                    );

                    return resolveCache.retrieve(source, '*');
                })
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.version).to.equal('0.2.0');
                    ext_expect_expect(canonicalDir).to.equal(
                        ext_path_path.join(sourceDir, '0.2.0')
                    );

                    next();
                })
                .done();
        });

        it('should resolve to the highest package that matches a range target, not ignoring pre-releases if they are the only versions', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);
            var json = { name: 'foo' };

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);

            json.version = '0.1.0-rc.1';
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0-rc.1'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.1.0-rc.1', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            json.version = '0.1.0-rc.2';
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0-rc.2'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.1.0-rc.2', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            resolveCache
                .retrieve(source, '~0.1.0')
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.version).to.equal('0.1.0-rc.2');
                    ext_expect_expect(canonicalDir).to.equal(
                        ext_path_path.join(sourceDir, '0.1.0-rc.2')
                    );

                    next();
                })
                .done();
        });

        it('should resolve to exact match (including build metadata) if available', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);
            var json = { name: 'foo' };
            var encoded;

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);

            json.version = '0.1.0';
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.1.0', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            json.version = '0.1.0+build.4';
            encoded = encodeURIComponent('0.1.0+build.4');
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, encoded));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, encoded, '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            json.version = '0.1.0+build.5';
            encoded = encodeURIComponent('0.1.0+build.5');
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, encoded));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, encoded, '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            json.version = '0.1.0+build.6';
            encoded = encodeURIComponent('0.1.0+build.6');
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, encoded));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, encoded, '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            resolveCache
                .retrieve(source, '0.1.0+build.5')
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta.version).to.equal('0.1.0+build.5');
                    ext_expect_expect(canonicalDir).to.equal(
                        ext_path_path.join(
                            sourceDir,
                            encodeURIComponent('0.1.0+build.5')
                        )
                    );

                    next();
                })
                .done();
        });

        it('should resolve to the _wildcard package if target is * and there are no semver versions', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);
            var json = { name: 'foo' };

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '_wildcard'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '_wildcard', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            resolveCache
                .retrieve(source, '*')
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(canonicalDir).to.equal(
                        ext_path_path.join(sourceDir, '_wildcard')
                    );

                    next();
                })
                .done();
        });

        it("should resolve to the exact target it's not a semver range", function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);
            var json = { name: 'foo' };

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, 'some-branch'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, 'some-branch', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, 'other-branch'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, 'other-branch', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            resolveCache
                .retrieve(source, 'some-branch')
                .spread(function(canonicalDir, pkgMeta) {
                    ext_expect_expect(pkgMeta).to.be.an('object');
                    ext_expect_expect(pkgMeta).to.not.have.property('version');

                    next();
                })
                .done();
        });
    });

    describe('.eliminate', function() {
        beforeEach(function() {
            ext_mkdirp_mkdirp.sync(cacheDir);
        });

        it('should delete the source-md5/version folder', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0'));

            resolveCache
                .eliminate({
                    name: 'foo',
                    version: '0.0.1',
                    _source: source,
                    _target: '*'
                })
                .then(function() {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '0.0.1'))).to.be(
                        false
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '0.1.0'))).to.be(
                        true
                    );

                    next();
                })
                .done();
        });

        it('should delete the source-md5/target folder', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, 'some-branch'));

            resolveCache
                .eliminate({
                    name: 'foo',
                    _source: source,
                    _target: 'some-branch'
                })
                .then(function() {
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, 'some-branch'))
                    ).to.be(false);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '0.0.1'))).to.be(
                        true
                    );

                    next();
                })
                .done();
        });

        it('should delete the source-md5/_wildcard folder', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '_wildcard'));

            resolveCache
                .eliminate({
                    name: 'foo',
                    _source: source,
                    _target: '*'
                })
                .then(function() {
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '_wildcard'))
                    ).to.be(false);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '0.0.1'))).to.be(
                        true
                    );

                    next();
                })
                .done();
        });

        it('should delete the source-md5 folder if empty', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));

            resolveCache
                .eliminate({
                    name: 'foo',
                    version: '0.0.1',
                    _source: source,
                    _target: '*'
                })
                .then(function() {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '0.0.1'))).to.be(
                        false
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir))).to.be(false);

                    next();
                })
                .done();
        });

        it('should remove entry from in memory cache if the source-md5 folder was deleted', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));

            // Feed up the cache
            resolveCache
                .versions(source)
                // Eliminate
                .then(function() {
                    return resolveCache.eliminate({
                        name: 'foo',
                        version: '0.0.1',
                        _source: source,
                        _target: '*'
                    });
                })
                .then(function() {
                    // At this point the parent folder should be deleted
                    // To test against the in-memory cache, we create a folder
                    // manually and request the versions
                    ext_mkdirp_mkdirp.sync(ext_path_path.join(sourceDir, '0.0.2'));

                    resolveCache.versions(source).then(function(versions) {
                        ext_expect_expect(versions).to.eql(['0.0.2']);

                        next();
                    });
                })
                .done();
        });
    });

    describe('.clear', function() {
        beforeEach(function() {
            ext_mkdirp_mkdirp.sync(cacheDir);
        });

        it('should empty the whole cache folder', function(next) {
            resolveCache
                .clear()
                .then(function() {
                    var files;

                    ext_expect_expect(libutilfs_fsjs.existsSync(cacheDir)).to.be(true);

                    files = libutilfs_fsjs.readdirSync(cacheDir);
                    ext_expect_expect(files.length).to.be(0);

                    next();
                })
                .done();
        });

        it('should erase the in-memory cache', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));

            // Feed the in-memory cache
            resolveCache
                .versions(source)
                // Clear
                .then(function() {
                    return resolveCache.clear();
                })
                .then(function() {
                    // To test against the in-memory cache, we create a folder
                    // manually and request the versions
                    ext_mkdirp_mkdirp.sync(ext_path_path.join(sourceDir, '0.0.2'));

                    resolveCache.versions(source).then(function(versions) {
                        ext_expect_expect(versions).to.eql(['0.0.2']);

                        next();
                    });
                })
                .done();
        });
    });

    describe('.reset', function() {
        it('should erase the in-memory cache', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));

            // Feed the in-memory cache
            resolveCache
                .versions(source)
                .then(function() {
                    // Delete 0.0.1 and create 0.0.2
                    libutilfs_fsjs.rmdirSync(ext_path_path.join(sourceDir, '0.0.1'));
                    libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.2'));

                    // Reset cache
                    resolveCache.reset();

                    // Get versions
                    return resolveCache.versions(source);
                })
                .then(function(versions) {
                    ext_expect_expect(versions).to.eql(['0.0.2']);

                    next();
                })
                .done();
        });
    });

    describe('.list', function() {
        beforeEach(function() {
            libutilrimraf_rimrafjsjs.sync(cacheDir);
            ext_mkdirp_mkdirp.sync(cacheDir);
        });

        it('should resolve to an empty array if the cache is empty', function(next) {
            resolveCache
                .list()
                .then(function(entries) {
                    ext_expect_expect(entries).to.be.an('array');
                    ext_expect_expect(entries.length).to.be(0);

                    next();
                })
                .done();
        });

        it('should resolve to an ordered array of entries (name ASC, release ASC)', function(next) {
            var source = 'list-package-1';
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            var source2 = 'list-package-2';
            var sourceId2 = ext_md5hex_md5(source2);
            var sourceDir2 = ext_path_path.join(cacheDir, sourceId2);

            var json = {
                name: 'foo'
            };

            // Create some versions for different sources
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            json.version = '0.0.1';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.0.1', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.1.0'));
            json.version = '0.1.0';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.1.0', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            delete json.version;

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, 'foo'));
            json._target = 'foo';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, 'foo', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, 'bar'));
            json._target = 'bar';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, 'bar', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, 'aa'));
            json._target = 'aa';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, 'aa', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            delete json._target;

            libutilfs_fsjs.mkdirSync(sourceDir2);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir2, '0.2.1'));
            json.version = '0.2.1';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir2, '0.2.1', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir2, '0.2.0'));
            json.name = 'abc';
            json.version = '0.2.0';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir2, '0.2.0', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            resolveCache
                .list()
                .then(function(entries) {
                    var expectedJson;
                    var bowerDir = ext_path_path.join(__dirname, '../..');

                    ext_expect_expect(entries).to.be.an('array');

                    expectedJson = libutilfs_fsjs.readFileSync(
                        ext_path_path.join(
                            __dirname,
                            '../assets/resolve-cache/list-json-1.json'
                        )
                    );

                    ext_mout_mout.object.forOwn(entries, function(entry) {
                        // Trim absolute bower path from json
                        entry.canonicalDir = entry.canonicalDir.substr(
                            bowerDir.length
                        );
                        // Convert windows \ paths to /
                        entry.canonicalDir = entry.canonicalDir.replace(
                            /\\/g,
                            '/'
                        );
                    });

                    ext_expect_expect(entries).to.eql(JSON.parse(expectedJson));

                    next();
                })
                .done();
        });

        it('should ignore lurking files where dirs are expected', function(next) {
            var source = 'list-package-1';
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);
            var json = {
                name: 'foo'
            };

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            json.version = '0.0.1';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.0.1', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            // Create lurking files
            libutilfs_fsjs.writeFileSync(ext_path_path.join(cacheDir, 'foo'), 'w00t');
            libutilfs_fsjs.writeFileSync(ext_path_path.join(cacheDir, '.DS_Store'), '');
            libutilfs_fsjs.writeFileSync(ext_path_path.join(sourceDir, 'foo'), 'w00t');
            libutilfs_fsjs.writeFileSync(ext_path_path.join(sourceDir, '.DS_Store'), '');

            // It should not error out
            resolveCache
                .list()
                .then(function(entries) {
                    ext_expect_expect(entries).to.be.an('array');
                    ext_expect_expect(entries.length).to.be(1);
                    ext_expect_expect(entries[0].pkgMeta).to.eql(json);

                    // Lurking file should have been removed
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(cacheDir, 'foo'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(cacheDir, '.DS_Store'))
                    ).to.be(false);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, 'foo'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '.DS_Store'))
                    ).to.be(false);

                    next();
                })
                .done();
        });

        it('should delete entries if failed to read package meta', function(next) {
            var source = 'list-package-1';
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);
            var json = {
                name: 'foo'
            };

            // Create invalid versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));

            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.2'));
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.0.2', '.bower.json'),
                'w00t'
            );

            // Create valid version
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.3'));
            json.version = '0.0.3';
            libutilfs_fsjs.writeFileSync(
                ext_path_path.join(sourceDir, '0.0.3', '.bower.json'),
                JSON.stringify(json, null, '  ')
            );

            // It should not error out
            resolveCache
                .list()
                .then(function(entries) {
                    ext_expect_expect(entries).to.be.an('array');
                    ext_expect_expect(entries.length).to.be(1);
                    ext_expect_expect(entries[0].pkgMeta).to.eql(json);

                    // Packages with invalid metas should have been removed
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '0.0.1'))).to.be(
                        false
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(sourceDir, '0.0.2'))).to.be(
                        false
                    );

                    next();
                })
                .done();
        });
    });

    describe('#clearRuntimeCache', function() {
        it('should clear the in-memory cache for all sources', function(next) {
            var source = String(Math.random());
            var sourceId = ext_md5hex_md5(source);
            var sourceDir = ext_path_path.join(cacheDir, sourceId);

            var source2 = String(Math.random());
            var sourceId2 = ext_md5hex_md5(source2);
            var sourceDir2 = ext_path_path.join(cacheDir, sourceId2);

            // Create some versions
            libutilfs_fsjs.mkdirSync(sourceDir);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.1'));
            libutilfs_fsjs.mkdirSync(sourceDir2);
            libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir2, '0.0.2'));

            // Feed the cache
            resolveCache
                .versions(source)
                .then(function() {
                    return resolveCache.versions(source2);
                })
                .then(function() {
                    // Create some more
                    libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir, '0.0.3'));
                    libutilfs_fsjs.mkdirSync(ext_path_path.join(sourceDir2, '0.0.4'));

                    // Reset cache
                    libcoreResolveCache_ResolveCachejs.clearRuntimeCache();
                })
                .then(function() {
                    return resolveCache
                        .versions(source)
                        .then(function(versions) {
                            ext_expect_expect(versions).to.eql(['0.0.3', '0.0.1']);

                            return resolveCache.versions(source2);
                        })
                        .then(function(versions) {
                            ext_expect_expect(versions).to.eql(['0.0.4', '0.0.2']);

                            next();
                        });
                })
                .done();
        });
    });
});
