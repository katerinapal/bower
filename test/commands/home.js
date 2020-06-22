import ext_q_Q from "q";
import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";

var home = helpers_helpersjsjs.command('home');

describe('bower home', function() {
    it('correctly reads arguments', function() {
        ext_expect_expect(home.readOptions(['foo'])).to.eql(['foo']);
    });

    var mainPackage = new helpers_helpersjsjs.TempDir({
        'bower.json': {
            name: 'package',
            homepage: 'http://bower.io'
        }
    });

    var wrongPackage = new helpers_helpersjsjs.TempDir({
        'bower.json': {
            name: 'package'
        }
    });

    it('opens repository home page in web browser', function() {
        mainPackage.prepare();

        return ext_q_Q.Promise(function(resolve) {
            var home = helpers_helpersjsjs.command('home', { opn: resolve });
            helpers_helpersjsjs.run(home, [mainPackage.path]);
        }).then(function(url) {
            ext_expect_expect(url).to.be('http://bower.io');
        });
    });

    it('opens home page of current repository', function() {
        mainPackage.prepare();

        return ext_q_Q.Promise(function(resolve) {
            var home = helpers_helpersjsjs.command('home', { opn: resolve });
            helpers_helpersjsjs.run(home, [undefined, { cwd: mainPackage.path }]);
        }).then(function(url) {
            ext_expect_expect(url).to.be('http://bower.io');
        });
    });

    it('errors if no homepage is set', function() {
        wrongPackage.prepare();

        return ext_q_Q.Promise(function(resolve) {
            var home = helpers_helpersjsjs.command('home', { opn: resolve });
            helpers_helpersjsjs.run(home, [wrongPackage.path]).fail(resolve);
        }).then(function(reason) {
            ext_expect_expect(reason.message).to.be('No homepage set for package');
            ext_expect_expect(reason.code).to.be('ENOHOME');
        });
    });
});
