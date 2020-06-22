import ext_path_path from "path";
import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";

var link = helpers_helpersjsjs.command('link');

describe('bower link', function() {
    var mainPackage = new helpers_helpersjsjs.TempDir({
        'bower.json': {
            name: 'package'
        },
        'index.js': 'Hello World!'
    });

    var otherPackage = new helpers_helpersjsjs.TempDir({
        'bower.json': {
            name: 'package2'
        },
        'index.js': 'Welcome World!'
    });

    var linksDir = new helpers_helpersjsjs.TempDir();

    beforeEach(function() {
        mainPackage.prepare();
        otherPackage.prepare();
        linksDir.prepare();
    });

    it('correctly reads arguments', function() {
        ext_expect_expect(link.readOptions(['jquery', 'angular'])).to.eql([
            'jquery',
            'angular'
        ]);
    });

    it('creates self link', function() {
        return helpers_helpersjsjs
            .run(link, [
                undefined,
                undefined,
                {
                    cwd: mainPackage.path,
                    storage: {
                        links: linksDir.path
                    }
                }
            ])
            .then(function() {
                ext_expect_expect(linksDir.read('package/index.js')).to.be('Hello World!');
            });
    });

    it('creates inter-link', function() {
        return helpers_helpersjsjs
            .run(link, [
                undefined,
                undefined,
                {
                    cwd: mainPackage.path,
                    storage: {
                        links: linksDir.path
                    }
                }
            ])
            .then(function() {
                return helpers_helpersjsjs.run(link, [
                    'package',
                    undefined,
                    {
                        cwd: otherPackage.path,
                        storage: {
                            links: linksDir.path
                        }
                    }
                ]);
            })
            .then(function() {
                ext_expect_expect(
                    otherPackage.read('bower_components/package/index.js')
                ).to.be('Hello World!');
            });
    });

    it('creates inter-link to relative config.directory', function() {
        return helpers_helpersjsjs
            .run(link, [
                undefined,
                undefined,
                {
                    cwd: mainPackage.path,
                    storage: {
                        links: linksDir.path
                    }
                }
            ])
            .then(function() {
                return helpers_helpersjsjs.run(link, [
                    'package',
                    undefined,
                    {
                        cwd: otherPackage.path,
                        directory: 'valid-extend',
                        storage: {
                            links: linksDir.path
                        }
                    }
                ]);
            })
            .then(function() {
                ext_expect_expect(
                    otherPackage.read('valid-extend/package/index.js')
                ).to.be('Hello World!');
            });
    });

    it('creates inter-link to absolute config.directory', function() {
        return helpers_helpersjsjs
            .run(link, [
                undefined,
                undefined,
                {
                    cwd: mainPackage.path,
                    storage: {
                        links: linksDir.path
                    }
                }
            ])
            .then(function() {
                return helpers_helpersjsjs.run(link, [
                    'package',
                    undefined,
                    {
                        cwd: ext_path_path.join(otherPackage.path, 'invalid'),
                        directory: ext_path_path.join(
                            otherPackage.path,
                            'valid-override'
                        ),
                        storage: {
                            links: linksDir.path
                        }
                    }
                ]);
            })
            .then(function() {
                ext_expect_expect(
                    otherPackage.read('valid-override/package/index.js')
                ).to.be('Hello World!');
            });
    });

    it('creates inter-link with custom local name', function() {
        return helpers_helpersjsjs
            .run(link, [
                undefined,
                undefined,
                {
                    cwd: mainPackage.path,
                    storage: {
                        links: linksDir.path
                    }
                }
            ])
            .then(function() {
                return helpers_helpersjsjs.run(link, [
                    'package',
                    'local',
                    {
                        cwd: otherPackage.path,
                        storage: {
                            links: linksDir.path
                        }
                    }
                ]);
            })
            .then(function() {
                ext_expect_expect(
                    otherPackage.read('bower_components/local/index.js')
                ).to.be('Hello World!');
            });
    });

    it('errors on unexising package', function() {
        return helpers_helpersjsjs
            .run(link, [
                'package',
                'local',
                {
                    cwd: otherPackage.path,
                    storage: {
                        links: linksDir.path
                    }
                }
            ])
            .then(function() {
                throw 'Should fail creating a link!';
            })
            .fail(function(reason) {
                ext_expect_expect(reason.code).to.be('ENOENT');
                ext_expect_expect(reason.message).to.be(
                    'Failed to create link to package'
                );
            });
    });
});
