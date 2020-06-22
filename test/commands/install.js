import ext_expect_expect from "expect.js";
import ext_path_path from "path";
import * as helpers_helpersjsjs from "../helpers";
import ext_nock_nock from "nock";
import ext_rimraf_rimraf from "rimraf";
import { fs as libutilfs_fsjs } from "../../lib/util/fs";
import ext_tarfs_tar from "tar-fs";
import ext_destroy_destroy from "destroy";
import ext_q_Q from "q";
import ext_fs_fs from "fs";

describe('bower install', function() {
    var tempDir = new helpers_helpersjsjs.TempDir();

    var install = helpers_helpersjsjs.command('install', {
        cwd: tempDir.path
    });

    it('correctly reads arguments', function() {
        ext_expect_expect(
            install.readOptions([
                'jquery',
                'angular',
                '-F',
                '-p',
                '-S',
                '-D',
                '-E'
            ])
        ).to.eql([
            ['jquery', 'angular'],
            {
                forceLatest: true,
                production: true,
                save: true,
                saveDev: true,
                saveExact: true
            }
        ]);
    });

    it('correctly reads long arguments', function() {
        ext_expect_expect(
            install.readOptions([
                'jquery',
                'angular',
                '--force-latest',
                '--production',
                '--save',
                '--save-dev',
                '--save-exact'
            ])
        ).to.eql([
            ['jquery', 'angular'],
            {
                forceLatest: true,
                production: true,
                save: true,
                saveDev: true,
                saveExact: true
            }
        ]);
    });

    var mainPackage = new helpers_helpersjsjs.TempDir({
        'bower.json': {
            name: 'package'
        }
    }).prepare();

    var gitPackage = new helpers_helpersjsjs.TempDir();

    gitPackage.prepareGit({
        '1.0.0': {
            'bower.json': {
                name: 'package'
            },
            'version.txt': '1.0.0'
        },
        '1.0.1': {
            'bower.json': {
                name: 'package'
            },
            'version.txt': '1.0.1'
        }
    });

    it('writes to bower.json if --save flag is used', function() {
        mainPackage.prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return helpers_helpersjsjs
            .run(install, [
                [mainPackage.path],
                {
                    save: true
                }
            ])
            .then(function() {
                ext_expect_expect(tempDir.read('bower.json')).to.contain('dependencies');
            });
    });

    it('does not write to bower.json if no --save flag is used', function() {
        mainPackage.prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return helpers_helpersjsjs.run(install, [[mainPackage.path], {}]).then(function() {
            ext_expect_expect(tempDir.read('bower.json')).to.not.contain('dependencies');
        });
    });

    it('writes to bower.json if save config setting is set to true', function() {
        mainPackage.prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return helpers_helpersjsjs
            .run(install, [
                [mainPackage.path],
                {},
                {
                    save: true
                }
            ])
            .then(function() {
                ext_expect_expect(tempDir.read('bower.json')).to.contain('dependencies');
            });
    });

    it('writes an exact version number to dependencies in bower.json if --save --save-exact flags are used', function() {
        mainPackage.prepare({
            'bower.json': {
                name: 'package',
                version: '1.2.3'
            }
        });

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return helpers_helpersjsjs
            .run(install, [
                [mainPackage.path],
                {
                    saveExact: true,
                    save: true
                }
            ])
            .then(function() {
                ext_expect_expect(
                    tempDir.readJson('bower.json').dependencies.package
                ).to.equal(mainPackage.path + '#1.2.3');
            });
    });

    it('writes an exact version number to dependencies in bower.json if save and save-exact config settings are set to true', function() {
        mainPackage.prepare({
            'bower.json': {
                name: 'package',
                version: '1.2.3'
            }
        });

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return helpers_helpersjsjs
            .run(install, [
                [mainPackage.path],
                {},
                {
                    saveExact: true,
                    save: true
                }
            ])
            .then(function() {
                ext_expect_expect(
                    tempDir.readJson('bower.json').dependencies.package
                ).to.equal(mainPackage.path + '#1.2.3');
            });
    });

    it('writes an exact version number to devDependencies in bower.json if --save-dev --save-exact flags are used', function() {
        mainPackage.prepare({
            'bower.json': {
                name: 'package',
                version: '0.1.0'
            }
        });

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return helpers_helpersjsjs
            .run(install, [
                [mainPackage.path],
                {
                    saveExact: true,
                    saveDev: true
                }
            ])
            .then(function() {
                ext_expect_expect(
                    tempDir.readJson('bower.json').devDependencies.package
                ).to.equal(mainPackage.path + '#0.1.0');
            });
    });

    it('writes an exact version number to devDependencies in bower.json if save-exact config setting is true and --save-dev flag is used', function() {
        mainPackage.prepare({
            'bower.json': {
                name: 'package',
                version: '0.1.0'
            }
        });

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return helpers_helpersjsjs
            .run(install, [
                [mainPackage.path],
                {
                    saveDev: true
                },
                {
                    saveExact: true
                }
            ])
            .then(function() {
                ext_expect_expect(
                    tempDir.readJson('bower.json').devDependencies.package
                ).to.equal(mainPackage.path + '#0.1.0');
            });
    });

    it('reads .bowerrc from cwd', function() {
        mainPackage.prepare({
            foo: 'bar'
        });

        tempDir.prepare({
            '.bowerrc': {
                directory: 'assets'
            },
            'bower.json': {
                name: 'test',
                dependencies: {
                    package: mainPackage.path
                }
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            ext_expect_expect(tempDir.read('assets/package/foo')).to.be('bar');
        });
    });

    it('.bowerrc directory can be an absolute path', function() {
        mainPackage.prepare({
            foo: 'bar'
        });

        tempDir.prepare({
            '.bowerrc': {
                directory: '/tmp/bower-absolute-destination-directory'
            },
            'bower.json': {
                name: 'test',
                dependencies: {
                    package: mainPackage.path
                }
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            ext_expect_expect(
                ext_fs_fs
                    .readFileSync(
                        '/tmp/bower-absolute-destination-directory/package/foo',
                        'utf8'
                    )
                    .toString()
            ).to.be('bar');
            var deferred = ext_q_Q.defer();
            ext_rimraf_rimraf('/tmp/bower-absolute-destination-directory', function(err) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve();
                }
            });
            return deferred;
        });
    });

    it('runs preinstall hook', function() {
        mainPackage.prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test',
                dependencies: {
                    package: mainPackage.path
                }
            },
            '.bowerrc': {
                scripts: {
                    preinstall:
                        'node -e \'require("fs").writeFileSync("preinstall.txt", "%")\''
                }
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            ext_expect_expect(tempDir.read('preinstall.txt')).to.be('package');
        });
    });

    it('runs postinstall hook', function() {
        mainPackage.prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test',
                dependencies: {
                    package: mainPackage.path
                }
            },
            '.bowerrc': {
                scripts: {
                    postinstall:
                        'node -e \'require("fs").writeFileSync("postinstall.txt", "%")\''
                }
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            ext_expect_expect(tempDir.read('postinstall.txt')).to.be('package');
        });
    });

    // To be discussed, but that's the implementation now
    it('does not run hooks if nothing is installed', function() {
        tempDir.prepare({
            'bower.json': {
                name: 'test'
            },
            '.bowerrc': {
                scripts: {
                    postinstall:
                        'node -e \'require("fs").writeFileSync("hooks.txt", "%")\'',
                    preinstall:
                        'node -e \'require("fs").writeFileSync("hooks.txt", "%")\''
                }
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            ext_expect_expect(tempDir.exists('hooks.txt')).to.be(false);
        });
    });

    it('runs postinstall after bower.json is written', function() {
        mainPackage.prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            },
            '.bowerrc': {
                scripts: {
                    postinstall:
                        'node -e \'var fs = require("fs"); fs.writeFileSync("hook.txt", fs.readFileSync("bower.json"));\''
                }
            }
        });

        return helpers_helpersjsjs
            .run(install, [
                [mainPackage.path],
                {
                    save: true
                }
            ])
            .then(function() {
                ext_expect_expect(tempDir.read('hook.txt')).to.contain('dependencies');
            });
    });

    it('display the output of hook scripts', function(next) {
        mainPackage.prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test',
                dependencies: {
                    package: mainPackage.path
                }
            },
            '.bowerrc': {
                scripts: {
                    postinstall: 'node -e \'process.stdout.write("foobar")\''
                }
            }
        });
        var lastAction = null;

        helpers_helpersjsjs
            .run(install)
            .logger.intercept(function(log) {
                if (log.level === 'action') {
                    lastAction = log;
                }
            })
            .on('end', function() {
                ext_expect_expect(lastAction.message).to.be('foobar');
                next();
            });
    });

    it('skips components not installed by bower', function() {
        mainPackage.prepare({
            '.git': {} //Make a dummy file instead of using slower gitPrepare()
        });

        tempDir.prepare({
            'bower.json': {
                name: 'test',
                dependencies: {
                    package: mainPackage.path
                }
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            var packageFiles = libutilfs_fsjs.readdirSync(mainPackage.path);
            //presence of .git file implies folder was not overwritten
            ext_expect_expect(packageFiles).to.contain('.git');
        });
    });

    it('works for git repositories', function() {
        gitPackage.prepareGit({
            '1.0.0': {
                'bower.json': {
                    name: 'package'
                },
                'version.txt': '1.0.0'
            },
            '1.0.1': {
                'bower.json': {
                    name: 'package'
                },
                'version.txt': '1.0.1'
            }
        });

        tempDir.prepare({
            'bower.json': {
                name: 'test',
                dependencies: {
                    package: gitPackage.path + '#1.0.0'
                }
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            ext_expect_expect(
                tempDir.read('bower_components/package/version.txt')
            ).to.contain('1.0.0');
        });
    });

    it('works for dependencies that point to tar files', function() {
        var packageDir = ext_path_path.join(__dirname, '../assets/package-tar.tar');
        tempDir.prepare({
            'bower.json': {
                name: 'test',
                dependencies: {
                    package: packageDir
                }
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            ext_expect_expect(
                tempDir.read('bower_components/package/index.txt')
            ).to.contain('1.0.0');
        });
    });

    it('does not install ignored dependencies', function() {
        mainPackage.prepare();
        var package2 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package2'
            }
        }).prepare();

        var package3 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package3',
                dependencies: {
                    package2: package2.path,
                    package: mainPackage.path
                }
            }
        }).prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test_tw',
                dependencies: {
                    package3: package3.path
                }
            },
            '.bowerrc': {
                ignoredDependencies: ['package']
            }
        });

        return helpers_helpersjsjs.run(install).then(function() {
            ext_expect_expect(tempDir.exists('bower_components/package')).to.be(false);
            ext_expect_expect(tempDir.exists('bower_components/package2')).to.be(true);
        });
    });

    it('does not install ignored dependencies if run multiple times', function() {
        mainPackage.prepare();
        var package2 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package2'
            }
        }).prepare();

        var package3 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package3',
                dependencies: {
                    package2: package2.path,
                    package: mainPackage.path
                }
            }
        }).prepare();

        tempDir.prepare({
            'bower.json': {
                name: 'test_tw',
                dependencies: {
                    package3: package3.path
                }
            },
            '.bowerrc': {
                ignoredDependencies: ['package']
            }
        });
        return helpers_helpersjsjs.run(install).then(function() {
            return helpers_helpersjsjs.run(install).then(function() {
                ext_expect_expect(tempDir.exists('bower_components/package')).to.be(false);
                ext_expect_expect(tempDir.exists('bower_components/package2')).to.be(true);
            });
        });
    });

    it('works if packages reference each other locally', function() {
        mainPackage.prepare();
        var package2 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package2',
                dependencies: {
                    package: mainPackage.path
                }
            }
        }).prepare();
        var package3 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package3',
                dependencies: {
                    package2: package2.path
                }
            }
        }).prepare();

        var installPackage = helpers_helpersjsjs.command('install', {
            cwd: mainPackage.path
        });
        var installPackage2 = helpers_helpersjsjs.command('install', {
            cwd: package2.path
        });
        var installPackage3 = helpers_helpersjsjs.command('install', {
            cwd: package3.path
        });
        return helpers_helpersjsjs.run(installPackage).then(function() {
            return helpers_helpersjsjs.run(installPackage2).then(function() {
                return helpers_helpersjsjs.run(installPackage3).then(function() {
                    ext_expect_expect(package2.exists('bower_components/package')).to.be(
                        true
                    );
                    ext_expect_expect(package3.exists('bower_components/package2')).to.be(
                        true
                    );
                    ext_expect_expect(package3.exists('bower_components/package')).to.be(
                        true
                    );
                });
            });
        });
    });

    it('works if packages are nested and reference each other locally', function() {
        // root directory for nested components
        var rootDir = new helpers_helpersjsjs.TempDir().prepare();

        var package1 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package'
            }
        });
        package1.path = ext_path_path.join(rootDir.path, 'src/a/b');
        package1.prepare();
        var package2 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package2',
                dependencies: {
                    package: package1.path
                }
            }
        });
        package2.path = ext_path_path.join(rootDir.path, 'src/a');
        package2.create(); // run create to avoid deleting nested directories
        var package3 = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package3',
                dependencies: {
                    package2: package2.path
                }
            }
        });
        package3.path = rootDir.path;
        package3.create(); // run create to avoid deleting nested directories

        var installPackage = helpers_helpersjsjs.command('install', {
            cwd: package1.path
        });
        var installPackage2 = helpers_helpersjsjs.command('install', {
            cwd: package2.path
        });
        var installPackage3 = helpers_helpersjsjs.command('install', {
            cwd: package3.path
        });
        return helpers_helpersjsjs.run(installPackage).then(function() {
            return helpers_helpersjsjs.run(installPackage2).then(function() {
                return helpers_helpersjsjs.run(installPackage3).then(function() {
                    ext_expect_expect(package2.exists('bower_components/package')).to.be(
                        true
                    );
                    ext_expect_expect(package3.exists('bower_components/package2')).to.be(
                        true
                    );
                    ext_expect_expect(package3.exists('bower_components/package')).to.be(
                        true
                    );
                });
            });
        });
    });

    it('recognizes proxy option in config', function(done) {
        this.timeout(10000);

        tempDir.prepare({
            'bower.json': {
                name: 'test_tw',
                dependencies: {
                    pure: 'http://github.com/yahoo/pure/archive/v0.6.0.tar.gz'
                }
            }
        });

        var install = helpers_helpersjsjs.command('install', {
            cwd: tempDir.path
        });

        ext_nock_nock('http://dummy.local')
            .get('http://github.com/yahoo/pure/archive/v0.6.0.tar.gz')
            .reply(500);

        return helpers_helpersjsjs
            .run(install, [
                undefined,
                undefined,
                { proxy: 'http://dummy.local/' }
            ])
            .fail(function(error) {
                ext_expect_expect(error.message).to.equal('Status code of 500');
                done();
            });
    });

    it('errors if the components directory is not a directory', function() {
        tempDir.prepare({
            '.bowerrc': {
                directory: '.bowerrc'
            }
        });

        return helpers_helpersjsjs.run(install).fail(function(error) {
            ext_expect_expect(error.code).to.equal('ENOTDIR');
        });
    });

    it('works if the package is a compressed single directory containing another directory with the same name', function() {
        var mainPackageBaseName = ext_path_path.basename(mainPackage.path);
        var parentDir = ext_path_path.dirname(mainPackage.path);

        // Setup the main package with a directory with the same name
        var mainPackageFiles = {};
        mainPackageFiles[mainPackageBaseName + '/test.js'] = 'test';
        mainPackage.prepare(mainPackageFiles);

        // Create an archive containing the main package
        var archiveDeferred = ext_q_Q.defer();
        var archivePath = ext_path_path.join(parentDir, mainPackageBaseName + '.tar');
        var stream = ext_tarfs_tar.pack(parentDir, { entries: [mainPackageBaseName] });
        stream
            .pipe(libutilfs_fsjs.createWriteStream(archivePath))
            .on('finish', function(result) {
                ext_destroy_destroy(stream);
                archiveDeferred.resolve(result);
            });

        //// Attempt to install the package from the archive
        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return archiveDeferred.promise
            .then(function() {
                return helpers_helpersjsjs.run(install, [[archivePath]]);
            })
            .then(function() {
                ext_expect_expect(
                    tempDir.read(
                        ext_path_path.join(
                            'bower_components',
                            'package',
                            mainPackageBaseName,
                            'test.js'
                        )
                    )
                ).to.contain('test');
            });
    });

    it('works if the package is an archive containing a file with an identical name', function() {
        var parentDir = ext_path_path.dirname(mainPackage.path);

        mainPackage.prepare({
            'package.tar': 'test'
        });

        var archiveDeferred = ext_q_Q.defer();
        var archivePath = ext_path_path.join(parentDir, 'package.tar');
        var stream = ext_tarfs_tar.pack(mainPackage.path);
        stream
            .pipe(libutilfs_fsjs.createWriteStream(archivePath))
            .on('finish', function(result) {
                ext_destroy_destroy(stream);
                archiveDeferred.resolve(result);
            });

        tempDir.prepare({
            'bower.json': {
                name: 'test'
            }
        });

        return archiveDeferred.promise
            .then(function() {
                return helpers_helpersjsjs.run(install, [[archivePath]]);
            })
            .then(function() {
                ext_expect_expect(
                    tempDir.read(
                        ext_path_path.join('bower_components', 'package', 'package.tar')
                    )
                ).to.contain('test');
            });
    });
    it('should handle @ as a divider', function() {
        return helpers_helpersjsjs
            .run(install, [
                ['empty@1.0.1'],
                {
                    save: true
                }
            ])
            .then(function() {
                ext_expect_expect(tempDir.readJson('bower.json').dependencies).to.eql({
                    empty: '1.0.1'
                });
            });
    });
});
