import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";
var help = helpers_helpersjsjs.command('help');

describe('bower help', function() {
    it('correctly reads arguments', function() {
        ext_expect_expect(help.readOptions(['foo'])).to.eql(['foo']);
    });

    it('shows general help', function() {
        return helpers_helpersjsjs.run(help).spread(function(result) {
            ext_expect_expect(result.usage[0]).to.be.a('string');
            ext_expect_expect(result.commands).to.be.a('object');
            ext_expect_expect(result.options).to.be.a('object');
        });
    });

    var commands = [
        'home',
        'info',
        'init',
        'install',
        'link',
        'list',
        'lookup',
        'prune',
        'register',
        'search',
        'update',
        'uninstall',
        'version',
        'cache list',
        'cache clean'
    ];

    commands.forEach(function(command) {
        it('shows help for ' + command + ' command', function() {
            return helpers_helpersjsjs.run(help, [command]).spread(function(result) {
                ext_expect_expect(result.command).to.be(command);
                ext_expect_expect(result.description).to.be.a('string');
                ext_expect_expect(result.usage[0]).to.be.a('string');
            });
        });
    });

    it('displays error for non-existing command', function() {
        return helpers_helpersjsjs.run(help, ['fuu']).fail(function(e) {
            ext_expect_expect(e.message).to.be('Unknown command: fuu');
            ext_expect_expect(e.command).to.be('fuu');
            ext_expect_expect(e.code).to.be('EUNKNOWNCMD');
        });
    });
});
