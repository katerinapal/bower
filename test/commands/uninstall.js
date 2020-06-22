import ext_path_path from "path";
import ext_mkdirp_mkdirp from "mkdirp";
import ext_expect_expect from "expect.js";
import { fs as libutilfs_fsjs } from "../../lib/util/fs";
import * as helpers_helpersjsjs from "../helpers";
var uninstall = helpers_helpersjsjs.command('uninstall');

describe('bower uninstall', function() {
    var tempDir = new helpers_helpersjsjs.TempDir({
        'bower.json': {
            name: 'hello-world',
            dependencies: {
                underscore: '*'
            }
        }
    });

    beforeEach(function() {
        tempDir.prepare();
    });

    var bowerJsonPath = ext_path_path.join(tempDir.path, 'bower.json');

    function bowerJson() {
        return JSON.parse(libutilfs_fsjs.readFileSync(bowerJsonPath));
    }

    var config = {
        cwd: tempDir.path,
        interactive: true
    };

    it('correctly reads arguments', function() {
        ext_expect_expect(uninstall.readOptions(['jquery', '-S', '-D'])).to.eql([
            ['jquery'],
            { save: true, saveDev: true }
        ]);
    });

    it('correctly reads long arguments', function() {
        ext_expect_expect(
            uninstall.readOptions(['jquery', '--save', '--save-dev'])
        ).to.eql([['jquery'], { save: true, saveDev: true }]);
    });

    it('does not remove anything from dependencies by default', function() {
        return helpers_helpersjsjs
            .run(uninstall, [['underscore'], undefined, config])
            .then(function() {
                ext_expect_expect(bowerJson().dependencies).to.eql({ underscore: '*' });
            });
    });

    it('removes dependency from bower.json if --save flag is used', function() {
        return helpers_helpersjsjs
            .run(uninstall, [['underscore'], { save: true }, config])
            .then(function() {
                ext_expect_expect(bowerJson().dependencies).to.eql({});
            });
    });

    it('removes dependency from bower.json if save config setting is true', function() {
        var configWithSave = {
            cwd: tempDir.path,
            interactive: true,
            save: true
        };
        return helpers_helpersjsjs
            .run(uninstall, [['underscore'], {}, configWithSave])
            .then(function() {
                ext_expect_expect(bowerJson().dependencies).to.eql({});
            });
    });

    it('removes dependency from relative config.directory', function() {
        var targetPath = ext_path_path.resolve(
            tempDir.path,
            'other_directory/underscore'
        );
        ext_mkdirp_mkdirp.sync(targetPath);
        libutilfs_fsjs.writeFileSync(
            ext_path_path.join(targetPath, '.bower.json'),
            '{ "name": "underscore" }'
        );

        return helpers_helpersjsjs
            .run(uninstall, [
                ['underscore'],
                undefined,
                {
                    cwd: tempDir.path,
                    directory: 'other_directory',
                    interactive: true
                }
            ])
            .then(function() {
                ext_expect_expect(function() {
                    libutilfs_fsjs.statSync(targetPath);
                }).to.throwException(/no such file or directory/);
            });
    });

    it('removes dependency from absolute config.directory', function() {
        var targetPath = ext_path_path.resolve(
            tempDir.path,
            'other_directory/underscore'
        );
        ext_mkdirp_mkdirp.sync(targetPath);
        libutilfs_fsjs.writeFileSync(
            ext_path_path.join(targetPath, '.bower.json'),
            '{ "name": "underscore" }'
        );

        return helpers_helpersjsjs
            .run(uninstall, [
                ['underscore'],
                undefined,
                {
                    cwd: tempDir.path,
                    directory: ext_path_path.resolve(tempDir.path, 'other_directory'),
                    interactive: true
                }
            ])
            .then(function() {
                ext_expect_expect(function() {
                    libutilfs_fsjs.statSync(targetPath);
                }).to.throwException(/no such file or directory/);
            });
    });

    it('removes a project with url from absolute path', function() {
        var targetPath = ext_path_path.resolve(
            tempDir.path,
            'other_directory/underscore'
        );
        ext_mkdirp_mkdirp.sync(targetPath);
        libutilfs_fsjs.writeFileSync(
            ext_path_path.join(targetPath, '.bower.json'),
            '{ "name": "underscore", "_source": "git://github.com/user/repo.git" }'
        );

        return helpers_helpersjsjs
            .run(uninstall, [
                ['git://github.com/user/repo.git'],
                undefined,
                {
                    cwd: tempDir.path,
                    directory: ext_path_path.resolve(tempDir.path, 'other_directory'),
                    interactive: true
                }
            ])
            .then(function() {
                ext_expect_expect(function() {
                    libutilfs_fsjs.statSync(targetPath);
                }).to.throwException(/no such file or directory/);
            });
    });
});
