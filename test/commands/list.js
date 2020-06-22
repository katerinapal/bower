import ext_expect_expect from "expect.js";
import ext_mout_mout from "mout";
import ext_path_path from "path";
import * as helpers_helpersjsjs from "../helpers";
var object = ext_mout_mout.object;

var commands = {
    install: helpers_helpersjsjs.command('install'),
    list: helpers_helpersjsjs.command('list')
};

describe('bower list', function() {
    var tempDir = new helpers_helpersjsjs.TempDir();

    var gitPackage = new helpers_helpersjsjs.TempDir();

    var install = function(packages, options, config) {
        config = object.merge(config || {}, {
            cwd: tempDir.path
        });

        return helpers_helpersjsjs.run(commands.install, [packages, options, config]);
    };

    var list = function(options, config) {
        config = object.merge(config || {}, {
            cwd: tempDir.path
        });

        return helpers_helpersjsjs.run(commands.list, [options, config]);
    };

    it('correctly reads arguments', function() {
        ext_expect_expect(commands.list.readOptions(['-p', '-r'])).to.eql([
            {
                paths: true,
                relative: true
            }
        ]);
    });

    it('correctly reads long arguments', function() {
        ext_expect_expect(commands.list.readOptions(['--paths', '--relative'])).to.eql([
            {
                paths: true,
                relative: true
            }
        ]);
    });

    it('lists no packages when nothing installed', function() {
        tempDir.prepare();

        return list().spread(function(results) {
            ext_expect_expect(results).to.be.an(Object);
            ext_expect_expect(results.canonicalDir).to.equal(tempDir.path);
            ext_expect_expect(results.pkgMeta.dependencies).to.eql({});
            ext_expect_expect(results.pkgMeta.devDependencies).to.eql({});
            ext_expect_expect(results.dependencies).to.eql({});
            ext_expect_expect(results.nrDependants).to.eql(0);
            ext_expect_expect(results.versions).to.eql([]);
        });
    });

    it('lists 1 dependency when 1 local package installed', function() {
        var mainPackage = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package',
                main: 'test.txt'
            }
        }).prepare();
        mainPackage.prepare();

        return install([mainPackage.path]).then(function() {
            return list().spread(function(results) {
                ext_expect_expect(results).to.be.an(Object);
                ext_expect_expect(results.canonicalDir).to.equal(tempDir.path);
                ext_expect_expect(results.pkgMeta.dependencies).to.eql({
                    package: mainPackage.path + '#*'
                });
                ext_expect_expect(results.pkgMeta.devDependencies).to.eql({});
                ext_expect_expect(results.dependencies.package).to.be.an(Object);
                ext_expect_expect(results.dependencies.package.pkgMeta).to.be.an(Object);
                ext_expect_expect(results.dependencies.package.pkgMeta.main).to.equal(
                    'test.txt'
                );
                ext_expect_expect(results.dependencies.package.canonicalDir).to.equal(
                    ext_path_path.join(tempDir.path, 'bower_components/package')
                );
                ext_expect_expect(results.dependencies.package.dependencies).to.eql({});
                ext_expect_expect(results.dependencies.package.nrDependants).to.equal(1);
                ext_expect_expect(results.dependencies.package.versions).to.eql([]);
                ext_expect_expect(results.nrDependants).to.equal(0);
                ext_expect_expect(results.versions).to.eql([]);
            });
        });
    });

    it('lists 1 dependency with relative paths when 1 local package installed', function() {
        var mainPackage = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package',
                main: 'test.txt'
            }
        }).prepare();
        mainPackage.prepare();

        return install([mainPackage.path]).then(function() {
            return list({ relative: true }).spread(function(results) {
                ext_expect_expect(results).to.be.an(Object);
                ext_expect_expect(results.canonicalDir).to.equal(tempDir.path);
                ext_expect_expect(results.dependencies).to.be.an(Object);
                ext_expect_expect(results.dependencies.package).to.be.an(Object);
                ext_expect_expect(results.dependencies.package.pkgMeta).to.be.an(Object);
                ext_expect_expect(results.dependencies.package.pkgMeta.main).to.equal(
                    'test.txt'
                );
                ext_expect_expect(results.pkgMeta.dependencies).to.eql({
                    package: mainPackage.path + '#*'
                });
                ext_expect_expect(results.dependencies.package.canonicalDir).to.equal(
                    ext_path_path.normalize('bower_components/package')
                );
            });
        });
    });

    it('lists 1 dependency with 1 source relative source mapping when 1 local package installed', function() {
        var mainPackage = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package',
                main: 'test.txt'
            }
        }).prepare();
        mainPackage.prepare();

        return install([mainPackage.path]).then(function() {
            return list({ paths: true }).spread(function(results) {
                ext_expect_expect(results).to.be.an(Object);
                ext_expect_expect(results.package).to.equal(
                    'bower_components/package/test.txt'
                );
            });
        });
    });

    it('lists 1 dependency with 2 source relative source mapping when 1 local package installed', function() {
        var mainPackage = new helpers_helpersjsjs.TempDir({
            'bower.json': {
                name: 'package',
                main: ['test.txt', 'test2.txt']
            }
        }).prepare();
        mainPackage.prepare();

        return install([mainPackage.path]).then(function() {
            return list({ paths: true }).spread(function(results) {
                ext_expect_expect(results).to.be.an(Object);
                ext_expect_expect(results.package).to.be.an(Object);
                ext_expect_expect(results.package).to.eql([
                    'bower_components/package/test.txt',
                    'bower_components/package/test2.txt'
                ]);
            });
        });
    });

    it('lists 1 dependency when 1 git package installed', function() {
        gitPackage.prepareGit({
            '1.0.0': {
                'bower.json': {
                    name: 'package',
                    main: 'test.txt'
                },
                'version.txt': '1.0.0'
            },
            '1.0.1': {
                'bower.json': {
                    name: 'package',
                    main: 'test2.txt'
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

        return install().then(function() {
            return list().spread(function(results) {
                ext_expect_expect(results).to.be.an(Object);
                ext_expect_expect(results.canonicalDir).to.equal(tempDir.path);
                ext_expect_expect(results.pkgMeta.dependencies).to.eql({
                    package: gitPackage.path + '#1.0.0'
                });
                ext_expect_expect(results.pkgMeta.devDependencies).to.eql({});
                ext_expect_expect(results.dependencies.package).to.be.an(Object);
                ext_expect_expect(results.dependencies.package.pkgMeta).to.be.an(Object);
                ext_expect_expect(results.dependencies.package.pkgMeta.main).to.equal(
                    'test.txt'
                );
                ext_expect_expect(results.dependencies.package.canonicalDir).to.equal(
                    ext_path_path.join(tempDir.path, 'bower_components/package')
                );
                ext_expect_expect(results.dependencies.package.dependencies).to.eql({});
                ext_expect_expect(results.dependencies.package.nrDependants).to.equal(1);
                ext_expect_expect(results.dependencies.package.versions).to.eql([
                    '1.0.1',
                    '1.0.0'
                ]);
                ext_expect_expect(results.nrDependants).to.equal(0);
                ext_expect_expect(results.versions).to.eql([]);
            });
        });
    });

    it('lists 1 dependency with relative paths when 1 git package installed', function() {
        gitPackage.prepareGit({
            '1.0.0': {
                'bower.json': {
                    name: 'package',
                    main: 'test.txt'
                },
                'version.txt': '1.0.0'
            },
            '1.0.1': {
                'bower.json': {
                    name: 'package',
                    main: 'test2.txt'
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

        return install().then(function() {
            return list({ relative: true }).spread(function(results) {
                ext_expect_expect(results.canonicalDir).to.equal(tempDir.path);
                ext_expect_expect(results.pkgMeta.dependencies).to.eql({
                    package: gitPackage.path + '#1.0.0'
                });
                ext_expect_expect(results.dependencies.package.canonicalDir).to.equal(
                    ext_path_path.normalize('bower_components/package')
                );
            });
        });
    });
});
