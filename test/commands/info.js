import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";
var info = helpers_helpersjsjs.command('info');

describe('bower info', function() {
    it('correctly reads arguments', function() {
        ext_expect_expect(info.readOptions(['pkg', 'property'])).to.eql([
            'pkg',
            'property'
        ]);
    });

    var meta = {
        name: 'package',
        version: '0.1.2',
        homepage: 'http://bower.io',
        description: 'Hello world!'
    };

    var meta2 = {
        name: 'package',
        version: '0.1.3',
        homepage: 'http://bower.io',
        description: 'Hello world! Hello!'
    };

    var mainPackage = new helpers_helpersjsjs.TempDir({
        '0.1.2': { 'bower.json': meta },
        '0.1.3': { 'bower.json': meta2 }
    });

    it('just returns if not package is specified', function() {
        return helpers_helpersjsjs.run(info).spread(function(results) {
            ext_expect_expect(results).to.be(undefined);
        });
    });

    it('shows info about given package', function() {
        mainPackage.prepareGit({});

        return helpers_helpersjsjs.run(info, [mainPackage.path]).spread(function(results) {
            ext_expect_expect(results).to.eql({
                latest: meta2,
                name: mainPackage.path,
                versions: ['0.1.3', '0.1.2']
            });
        });
    });
    it('should handle @ as a divider', function() {
        return helpers_helpersjsjs
            .run(info, [mainPackage.path + '@0.1.3'])
            .spread(function(results) {
                ext_expect_expect(results).to.eql({
                    name: 'package',
                    version: '0.1.3',
                    homepage: 'http://bower.io',
                    description: 'Hello world! Hello!'
                });
            });
    });
});
