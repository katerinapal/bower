import ext_expect_expect from "expect.js";
import ext_path_path from "path";
import { fs as libutilfs_fsjs } from "../../../lib/util/fs";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../../../lib/util/rimraf";
import ext_mkdirp_mkdirp from "mkdirp";
import ext_q_Q from "q";
import ext_bowerlogger_Logger from "bower-logger";
import { cmd as libutilcmd_cmdjs } from "../../../lib/util/cmd";
import * as libutilcopy_copyjsjs from "../../../lib/util/copy";
import { FsResolver as libcoreresolversFsResolver_FsResolverjs } from "../../../lib/core/resolvers/FsResolver";
import { defaultConfig as libconfig_defaultConfigjs } from "../../../lib/config";

describe('FsResolver', function() {
    var tempSource;
    var logger;
    var testPackage = ext_path_path.resolve(__dirname, '../../assets/package-a');

    before(function(next) {
        logger = new ext_bowerlogger_Logger();
        // Checkout test package version 0.2.1 which has a bower.json
        // with ignores
        libutilcmd_cmdjs('git', ['checkout', '0.2.1'], { cwd: testPackage }).then(
            next.bind(next, null),
            next
        );
    });

    afterEach(function(next) {
        logger.removeAllListeners();

        if (tempSource) {
            libutilrimraf_rimrafjsjs(tempSource, next);
            tempSource = null;
        } else {
            next();
        }
    });

    function create(decEndpoint) {
        if (typeof decEndpoint === 'string') {
            decEndpoint = { source: decEndpoint };
        }

        return new libcoreresolversFsResolver_FsResolverjs(decEndpoint, libconfig_defaultConfigjs(), logger);
    }

    describe('.constructor', function() {
        it('should guess the name from the path', function() {
            var resolver = create(ext_path_path.resolve('../../assets/package-zip.zip'));

            ext_expect_expect(resolver.getName()).to.equal('package-zip');
        });

        it('should make paths absolute and normalized', function() {
            var resolver;

            resolver = create(ext_path_path.relative(process.cwd(), testPackage));
            ext_expect_expect(resolver.getSource()).to.equal(testPackage);

            resolver = create(testPackage + '/something/..');
            ext_expect_expect(resolver.getSource()).to.equal(testPackage);
        });

        it.skip('should use config.cwd for resolving relative paths');

        it('should error out if a target was specified', function(next) {
            var resolver;

            try {
                resolver = create({ source: testPackage, target: '0.0.1' });
            } catch (err) {
                ext_expect_expect(err).to.be.an(Error);
                ext_expect_expect(err.message).to.match(/can\'t resolve targets/i);
                ext_expect_expect(err.code).to.equal('ENORESTARGET');
                return next();
            }

            next(new Error('Should have thrown'));
        });
    });

    describe('.hasNew', function() {
        it('should resolve always to true (for now..)', function(next) {
            var resolver = create(testPackage);

            var pkgMeta = {
                name: 'test'
            };

            resolver
                .hasNew(pkgMeta)
                .then(function(hasNew) {
                    ext_expect_expect(hasNew).to.be(true);
                    next();
                })
                .done();
        });

        //it.skip('should be false if the file mtime hasn\'t changed');
        //it.skip('should be false if the directory mtime hasn\'t changed');
        //it.skip('should be true if the file mtime has changed');
        //it.skip('should be true if the directory mtime has changed');
        //it.skip('should ignore files specified to be ignored');
    });

    describe('.resolve', function() {
        // Function to assert that the main property of the
        // package meta of a canonical dir is set to the
        // expected value
        function assertMain(dir, singleFile) {
            return ext_q_Q.nfcall(libutilfs_fsjs.readFile, ext_path_path.join(dir, '.bower.json')).then(
                function(contents) {
                    var pkgMeta = JSON.parse(contents.toString());

                    ext_expect_expect(pkgMeta.main).to.equal(singleFile);

                    return pkgMeta;
                }
            );
        }

        it('should copy the source directory contents', function(next) {
            var resolver = create(testPackage);

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'README.md'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'more'))).to.be(true);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'more', 'more-foo'))
                    ).to.be(true);
                    next();
                })
                .done();
        });

        it('should copy the source file, renaming it to index', function(next) {
            var resolver = create(ext_path_path.join(testPackage, 'foo'));

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo'))).to.be(false);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar'))).to.be(false);
                })
                .then(function() {
                    // Test with extension
                    var resolver = create(ext_path_path.join(testPackage, 'README.md'));
                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index.md'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'README.md'))).to.be(
                        false
                    );

                    return assertMain(dir, 'index.md').then(
                        next.bind(next, null)
                    );
                })
                .done();
        });

        it('should rename to index if source is a folder with just one file in it', function(next) {
            var resolver;

            tempSource = ext_path_path.resolve(__dirname, '../../tmp/tmp');

            ext_mkdirp_mkdirp.sync(tempSource);
            resolver = create(tempSource);

            libutilcopy_copyjsjs
                .copyFile(
                    ext_path_path.join(testPackage, 'foo'),
                    ext_path_path.join(tempSource, 'foo')
                )
                .then(resolver.resolve.bind(resolver))
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo'))).to.be(false);

                    return assertMain(dir, 'index').then(next.bind(next, null));
                })
                .done();
        });

        it('should not rename to index if source is a folder with just bower.json/component.json file in it', function(next) {
            var resolver;

            tempSource = ext_path_path.resolve(__dirname, '../../tmp/tmp');

            ext_mkdirp_mkdirp.sync(tempSource);
            resolver = create(tempSource);

            libutilcopy_copyjsjs
                .copyFile(
                    ext_path_path.join(testPackage, 'bower.json'),
                    ext_path_path.join(tempSource, 'bower.json')
                )
                .then(resolver.resolve.bind(resolver))
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bower.json'))).to.be(
                        true
                    );

                    libutilrimraf_rimrafjsjs.sync(tempSource);
                    ext_mkdirp_mkdirp.sync(tempSource);

                    resolver = create(tempSource);
                })
                .then(
                    libutilcopy_copyjsjs.copyFile.bind(
                        libutilcopy_copyjsjs,
                        ext_path_path.join(testPackage, 'bower.json'),
                        ext_path_path.join(tempSource, 'component.json')
                    )
                )
                .then(function() {
                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'component.json'))
                    ).to.be(true);
                    next();
                })
                .done();
        });

        it('should copy the source directory permissions', function(next) {
            var mode0777;
            var resolver;

            tempSource = ext_path_path.resolve(__dirname, '../../assets/package-a-copy');
            resolver = create(tempSource);

            libutilcopy_copyjsjs
                .copyDir(testPackage, tempSource)
                .then(function() {
                    // Change tempSource dir to 0777
                    libutilfs_fsjs.chmodSync(tempSource, 0o777);
                    // Get the mode to a variable
                    mode0777 = libutilfs_fsjs.statSync(tempSource).mode;
                })
                .then(resolver.resolve.bind(resolver))
                .then(function(dir) {
                    // Check if temporary dir is 0777 instead of default 0777 & ~process.umask()
                    var stat = libutilfs_fsjs.statSync(dir);
                    ext_expect_expect(stat.mode).to.equal(mode0777);
                    next();
                })
                .done();
        });

        it('should copy the source file permissions', function(next) {
            var mode0777;
            var resolver;

            tempSource = ext_path_path.resolve(__dirname, '../../tmp/temp-source');
            resolver = create(tempSource);

            libutilcopy_copyjsjs
                .copyFile(ext_path_path.join(testPackage, 'foo'), tempSource)
                .then(function() {
                    // Change tempSource dir to 0777
                    libutilfs_fsjs.chmodSync(tempSource, 0o777);
                    // Get the mode to a variable
                    mode0777 = libutilfs_fsjs.statSync(tempSource).mode;
                })
                .then(resolver.resolve.bind(resolver))
                .then(function(dir) {
                    // Check if file is 0777
                    var stat = libutilfs_fsjs.statSync(ext_path_path.join(dir, 'index'));
                    ext_expect_expect(stat.mode).to.equal(mode0777);
                    next();
                })
                .done();
        });

        it('should not copy ignored paths (to speed up copying)', function(next) {
            var resolver = create(testPackage);

            // Override the _applyPkgMeta function to prevent it from deleting ignored files
            resolver._applyPkgMeta = function() {
                return ext_q_Q.resolve();
            };

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'test'))).to.be(false);
                    next();
                })
                .done();
        });

        it('should extract if source is an archive', function(next) {
            var resolver = create(
                ext_path_path.resolve(__dirname, '../../assets/package-zip.zip')
            );

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip.zip'))
                    ).to.be(false);
                    next();
                })
                .done();
        });

        it('should copy extracted folder contents if archive contains only a folder inside', function(next) {
            var resolver = create(
                ext_path_path.resolve(__dirname, '../../assets/package-zip-folder.zip')
            );

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip-folder'))
                    ).to.be(false);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip-folder.zip'))
                    ).to.be(false);
                    next();
                })
                .done();
        });

        it("should extract if source is an archive and rename to index if it's only one file inside", function(next) {
            var resolver = create(
                ext_path_path.resolve(
                    __dirname,
                    '../../assets/package-zip-single-file.zip'
                )
            );

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index.js'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip-single-file'))
                    ).to.be(false);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(
                            ext_path_path.join(dir, 'package-zip-single-file.zip')
                        )
                    ).to.be(false);

                    return assertMain(dir, 'index.js').then(
                        next.bind(next, null)
                    );
                })
                .done();
        });

        it('should rename single file from a single folder to index when source is an archive', function(next) {
            var resolver = create(
                ext_path_path.resolve(
                    __dirname,
                    '../../assets/package-zip-folder-single-file.zip'
                )
            );

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index.js'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(
                            ext_path_path.join(dir, 'package-zip-folder-single-file')
                        )
                    ).to.be(false);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(
                            ext_path_path.join(dir, 'package-zip-folder-single-file.zip')
                        )
                    ).to.be(false);

                    return assertMain(dir, 'index.js').then(
                        next.bind(next, null)
                    );
                })
                .done();
        });
    });

    describe('#isTargetable', function() {
        it('should return false', function() {
            ext_expect_expect(libcoreresolversFsResolver_FsResolverjs.isTargetable()).to.be(false);
        });
    });
});
