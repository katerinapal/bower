import ext_expect_expect from "expect.js";
import ext_md5hex_md5 from "md5-hex";
import * as helpers_helpersjsjs from "../../helpers";
import ext_moutobject_object from "mout/object";

var cacheClean = helpers_helpersjsjs.command('cache/clean');

describe('bower cache clean', function() {
    // Because directory names are required to be md5 of _source
    var cacheFilesFactory = function(spec) {
        var files = {};

        ext_moutobject_object.map(spec, function(bowerJson) {
            bowerJson._source = bowerJson.name + '/' + bowerJson.version;
            var path =
                ext_md5hex_md5(bowerJson._source) +
                '/' +
                bowerJson.version +
                '/.bower.json';
            files[path] = bowerJson;
        });

        return files;
    };

    var cacheFiles = cacheFilesFactory([
        {
            name: 'angular',
            version: '1.3.8'
        },
        {
            name: 'angular',
            version: '1.3.9'
        },
        {
            name: 'jquery',
            version: '1.0.0'
        }
    ]);

    var cacheDir = new helpers_helpersjsjs.TempDir(cacheFiles);

    it('correctly reads arguments', function() {
        ext_expect_expect(cacheClean.readOptions(['jquery', 'angular'])).to.eql([
            ['jquery', 'angular'],
            {}
        ]);
    });

    it('removes all cache', function() {
        cacheDir.prepare();

        return helpers_helpersjsjs
            .run(cacheClean, [
                undefined,
                {},
                {
                    storage: {
                        packages: cacheDir.path
                    }
                }
            ])
            .spread(function(result) {
                ext_moutobject_object.map(cacheFiles, function(_, cacheFile) {
                    ext_expect_expect(cacheDir.exists(cacheFile)).to.be(false);
                });
            });
    });

    it('removes single package', function() {
        cacheDir.prepare();

        return helpers_helpersjsjs
            .run(cacheClean, [
                ['angular'],
                {},
                {
                    storage: {
                        packages: cacheDir.path
                    }
                }
            ])
            .spread(function(result) {
                var paths = Object.keys(cacheFiles);
                ext_expect_expect(cacheDir.exists(paths[0])).to.be(false);
                ext_expect_expect(cacheDir.exists(paths[1])).to.be(false);
                ext_expect_expect(cacheDir.exists(paths[2])).to.be(true);
            });
    });

    it('removes single package package version', function() {
        cacheDir.prepare();

        return helpers_helpersjsjs
            .run(cacheClean, [
                ['angular#1.3.8'],
                {},
                {
                    storage: {
                        packages: cacheDir.path
                    }
                }
            ])
            .spread(function(result) {
                var paths = Object.keys(cacheFiles);
                ext_expect_expect(cacheDir.exists(paths[0])).to.be(false);
                ext_expect_expect(cacheDir.exists(paths[1])).to.be(true);
                ext_expect_expect(cacheDir.exists(paths[2])).to.be(true);
            });
    });
});
