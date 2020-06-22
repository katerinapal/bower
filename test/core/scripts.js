import ext_path_path from "path";
import { indexjs as libindex_indexjsjs } from "../../lib/index.js";
import ext_mkdirp_mkdirp from "mkdirp";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../../lib/util/rimraf";
import { fs as libutilfs_fsjs } from "../../lib/util/fs";
import ext_expect_expect from "expect.js";
import { scriptsjs as libcorescripts_scriptsjsjs } from "../../lib/core/scripts.js";

describe('scripts', function() {
    var tempDir = ext_path_path.join(__dirname, '../tmp/temp-scripts');
    var packageName = 'package-zip';
    var packageDir = ext_path_path.join(__dirname, '../assets/' + packageName + '.zip');

    // We cannot use pure touch, because Windows
    var touch = function(file) {
        return (
            "node -e \"var fs = require('fs'); fs.closeSync(fs.openSync('" +
            file +
            "', 'w'));\""
        );
    };

    // We cannot use pure touch, because Windows
    var touchWithPid = function(file) {
        return (
            "node -e \"var fs = require('fs'); fs.closeSync(fs.openSync(process.env.BOWER_PID + '" +
            file +
            "', 'w'));\""
        );
    };

    var config = {
        cwd: tempDir,
        scripts: {
            preinstall: touch('preinstall_%_%'),
            postinstall: touch('postinstall_%_%'),
            preuninstall: touch('preuninstall_%_%'),
            postuninstall: touch('postuninstall_%_%')
        }
    };

    before(function(next) {
        ext_mkdirp_mkdirp(tempDir, next);
    });

    after(function(next) {
        libutilrimraf_rimrafjsjs(tempDir, next);
    });

    it('should run preinstall and postinstall hooks.', function(next) {
        libindex_indexjsjs.commands
            .install([packageDir], undefined, config)
            .on('end', function(installed) {
                ext_expect_expect(
                    libutilfs_fsjs.existsSync(
                        ext_path_path.join(
                            tempDir,
                            'preinstall_' + packageName + '_' + packageName
                        )
                    )
                ).to.be(true);
                ext_expect_expect(
                    libutilfs_fsjs.existsSync(
                        ext_path_path.join(
                            tempDir,
                            'postinstall_' + packageName + '_' + packageName
                        )
                    )
                ).to.be(true);

                next();
            });
    });

    it('should run preuninstall hook.', function(next) {
        libindex_indexjsjs.commands
            .uninstall([packageName], undefined, config)
            .on('end', function(installed) {
                ext_expect_expect(
                    libutilfs_fsjs.existsSync(
                        ext_path_path.join(
                            tempDir,
                            'preuninstall_' + packageName + '_' + packageName
                        )
                    )
                ).to.be(true);

                next();
            });
    });

    it('should run postuninstall hook.', function(next) {
        libindex_indexjsjs.commands
            .uninstall([packageName], undefined, config)
            .on('end', function(installed) {
                ext_expect_expect(
                    libutilfs_fsjs.existsSync(
                        ext_path_path.join(
                            tempDir,
                            'postuninstall_' + packageName + '_' + packageName
                        )
                    )
                ).to.be(true);

                next();
            });
    });

    it('should not break anything when no hooks configured.', function(next) {
        libindex_indexjsjs.commands
            .uninstall([packageName], undefined, { cwd: tempDir })
            .on('end', function(installed) {
                //no exception then we're good

                next();
            });
    });

    it('should reorder packages by dependencies, while trying to maintain order from bower.json, correctly.', function() {
        var mockAngularUI = {
            dependencies: {
                angular: '*'
            }
        };
        var mockJQuery = {
            dependencies: {}
        };
        var mockAngular = {
            dependencies: {
                jquery: '*'
            }
        };
        var mockMoment = {
            dependencies: {}
        };
        var mockSelect2 = {
            dependencies: {
                jquery: '*'
            }
        };
        var mockBadPackage = {
            dependencies: {
                'something-not-installed': '*'
            }
        };

        var packages = {
            select2: mockSelect2,
            'angular-ui': mockAngularUI,
            jquery: mockJQuery,
            'bad-package': mockBadPackage,
            angular: mockAngular,
            moment: mockMoment
        };
        var installed = [];
        var mockBowerJson = {
            dependencies: {
                jquery: '*',
                select2: '*',
                'angular-ui': '*',
                angular: '*',
                moment: '*'
            }
        };

        var ordered = libcorescripts_scriptsjsjs._orderByDependencies(
            packages,
            installed,
            mockBowerJson
        );
        ext_expect_expect(ordered).to.eql([
            'jquery',
            'select2',
            'angular',
            'angular-ui',
            'moment',
            'bad-package'
        ]);
    });

    it('should process scripts with quotes and vars in the cmd properly.', function(next) {
        config.scripts.preinstall = touchWithPid(' %');

        libindex_indexjsjs.commands
            .install([packageDir], undefined, config)
            .on('end', function(installed) {
                ext_expect_expect(
                    libutilfs_fsjs.existsSync(
                        ext_path_path.join(tempDir, process.pid + ' ' + packageName)
                    )
                ).to.be(true);

                next();
            });
    });
});
