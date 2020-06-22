import ext_expect_expect from "expect.js";
import ext_path_path from "path";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../../lib/util/rimraf";
import ext_bowerlogger_Logger from "bower-logger";
import { Manager as libcoreManager_Managerjs } from "../../lib/core/Manager";
import { defaultConfig as libconfig_defaultConfigjs } from "../../lib/config";

describe('Manager', function() {
    var manager;

    var packagesCacheDir = ext_path_path.join(__dirname, '../assets/temp-resolve-cache');

    var registryCacheDir = ext_path_path.join(
        __dirname,
        '../assets/temp-registry-cache'
    );

    after(function() {
        libutilrimraf_rimrafjsjs.sync(registryCacheDir);
        libutilrimraf_rimrafjsjs.sync(packagesCacheDir);
    });

    beforeEach(function(next) {
        var logger = new ext_bowerlogger_Logger();

        var config = libconfig_defaultConfigjs({
            storage: {
                packages: packagesCacheDir,
                registry: registryCacheDir
            }
        });

        manager = new libcoreManager_Managerjs(config, logger);

        next();
    });

    describe('resolve', function() {
        it('prefers exact versions over ranges', function() {
            manager._resolved = {
                ember: [
                    {
                        target: '>=1.4',
                        pkgMeta: { version: '2.7.0' }
                    },
                    {
                        target: '2.7.0',
                        pkgMeta: { version: '2.7.0' }
                    }
                ]
            };

            return manager.resolve().then(function() {
                ext_expect_expect(manager._dissected).to.eql({
                    ember: {
                        target: '2.7.0',
                        pkgMeta: { version: '2.7.0' }
                    }
                });
            });
        });
    });

    describe('_areCompatible', function() {
        describe('resolved is being fetched', function() {
            it('accepts endpoints with same targets', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: 'xxx' },
                        { name: 'bar', target: 'xxx' }
                    )
                ).to.be(true);
            });

            it('rejects endpoints with different targets', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: 'xxx' },
                        { name: 'bar', target: 'yyy' }
                    )
                ).to.be(false);
            });

            it('accepts with version and matching range', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '0.1.2' },
                        { name: 'bar', target: '~0.1.0' }
                    )
                ).to.be(true);
            });

            it('rejects with version and non-matching range', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '0.1.2' },
                        { name: 'bar', target: '~0.1.3' }
                    )
                ).to.be(false);
            });

            it('accepts with matching range and version', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '~0.1.0' },
                        { name: 'bar', target: '0.1.2' }
                    )
                ).to.be(true);
            });

            it('accepts with non-matching range and version', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '~0.1.3' },
                        { name: 'bar', target: '0.1.2' }
                    )
                ).to.be(false);
            });

            it('accepts with matching ranges', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '~0.1.0' },
                        { name: 'bar', target: '~0.1.3' }
                    )
                ).to.be(true);
            });

            it('rejects with non-matching ranges', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '~0.1.0' },
                        { name: 'bar', target: '~0.2.3' }
                    )
                ).to.be(false);
            });

            it('rejects with non-matching ranges', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '~0.1.0' },
                        { name: 'bar', target: 'xxx' }
                    )
                ).to.be(false);
            });
        });

        describe('resolved is already fetched', function() {
            var resolved = {
                name: 'foo',
                target: '~1.2.1',
                pkgMeta: {
                    version: '1.2.3'
                }
            };

            it('accepts if the same version as resolved', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '1.2.3' },
                        resolved
                    )
                ).to.be(true);
            });

            it('rejects if different version than resolved', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '1.2.4' },
                        resolved
                    )
                ).to.be(false);
            });

            it('accepts if range matches resolved version', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '~1.2.1' },
                        resolved
                    )
                ).to.be(true);
            });

            it('rejects if range does not match', function() {
                ext_expect_expect(
                    manager._areCompatible(
                        { name: 'foo', target: '~1.2.4' },
                        resolved
                    )
                ).to.be(false);
            });
        });
    });

    describe('_getCap', function() {
        it('finds highest bound', function() {
            var highest = manager._getCap(
                [['2.1.1-0', '<2.2.0-0'], '<3.2.0'],
                'highest'
            );

            ext_expect_expect(highest).to.eql({
                version: '3.2.0',
                comparator: '<'
            });
        });

        it('finds lowest bound', function() {
            var highest = manager._getCap(
                [['2.1.1-0', '<2.2.0-0'], '<3.2.0'],
                'lowest'
            );

            ext_expect_expect(highest).to.eql({
                version: '2.1.1-0',
                comparator: ''
            });
        });

        it('defaults to highest bound', function() {
            var highest = manager._getCap(['1.0.0', '2.0.0']);

            ext_expect_expect(highest).to.eql({
                version: '2.0.0',
                comparator: ''
            });
        });

        it('ignores non-semver elements', function() {
            var highest = manager._getCap(['0.9', '>1.0.1', ['<1.0.0', 'lol']]);

            ext_expect_expect(highest).to.eql({
                version: '1.0.1',
                comparator: '>'
            });
        });

        it('returns empty object if cap is not found', function() {
            var highest = manager._getCap(
                ['0.9'] // Not a semver
            );

            ext_expect_expect(highest).to.eql({});
        });
    });

    describe('_uniquify', function() {
        it('leaves last unique element', function() {
            var unique = manager._uniquify([
                { name: 'foo', id: 1 },
                { name: 'foo', id: 2 }
            ]);
            ext_expect_expect(unique).to.eql([{ name: 'foo', id: 2 }]);
        });

        it('compares by name first', function() {
            var unique = manager._uniquify([
                { name: 'foo', source: 'google.com' },
                { name: 'foo', source: 'facebook.com' }
            ]);

            ext_expect_expect(unique).to.eql([{ name: 'foo', source: 'facebook.com' }]);
        });

        it('compares by source if name is not available', function() {
            var unique = manager._uniquify([
                { source: 'facebook.com' },
                { source: 'facebook.com' }
            ]);

            ext_expect_expect(unique).to.eql([{ source: 'facebook.com' }]);
        });

        it('leaves different targets intact', function() {
            var unique = manager._uniquify([
                { source: 'facebook.com', target: 'a1b2c3' },
                { source: 'facebook.com', target: 'ffffff' }
            ]);

            ext_expect_expect(unique).to.eql([
                { source: 'facebook.com', target: 'a1b2c3' },
                { source: 'facebook.com', target: 'ffffff' }
            ]);
        });

        it('removes if same targets', function() {
            var unique = manager._uniquify([
                { source: 'facebook.com', target: 'ffffff' },
                { source: 'facebook.com', target: 'ffffff' }
            ]);

            ext_expect_expect(unique).to.eql([
                { source: 'facebook.com', target: 'ffffff' }
            ]);
        });

        it('ignores other fields', function() {
            var unique = manager._uniquify([
                { source: 'facebook.com', foo: 12 },
                { source: 'facebook.com', bar: 13 }
            ]);

            ext_expect_expect(unique).to.eql([{ source: 'facebook.com', bar: 13 }]);
        });
    });
});
