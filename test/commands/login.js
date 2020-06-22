import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";

var fakeGitHub = function(authenticate) {
    function FakeGitHub() {}

    var _creds;

    FakeGitHub.prototype.authenticate = function(creds) {
        _creds = creds;
    };

    FakeGitHub.prototype.authorization = {
        create: function(options, cb) {
            if (_creds.password === 'validpassword') {
                cb(null, { token: 'faketoken' });
            } else if (_creds.password === 'withtwofactor') {
                if (
                    options.headers &&
                    options.headers['X-GitHub-OTP'] === '123456'
                ) {
                    cb(null, { token: 'faketwoauthtoken' });
                } else {
                    cb({
                        code: 401,
                        message:
                            '{ "message": "Must specify two-factor authentication OTP code." }'
                    });
                }
            } else {
                cb({ code: 401, message: 'Bad credentials' });
            }
        }
    };

    return FakeGitHub;
};

var fakeConfigstore = function(set, get) {
    function FakeConfigstore() {}

    FakeConfigstore.prototype.set = set;
    FakeConfigstore.prototype.get = get;

    return FakeConfigstore;
};

var login = helpers_helpersjsjs.command('login');

var loginFactory = function(options) {
    return helpers_helpersjsjs.command('login', {
        github: fakeGitHub(),
        configstore: fakeConfigstore(
            options.set ||
                function() {
                    return true;
                },
            options.get ||
                function() {
                    return true;
                }
        )
    });
};

describe('bower login', function() {
    it('correctly reads arguments', function() {
        ext_expect_expect(login.readOptions(['--token', 'foobar'])).to.eql([
            { token: 'foobar' }
        ]);
    });

    it('fails if run in non-interactive shell without token passed', function() {
        return helpers_helpersjsjs.run(login, []).fail(function(reason) {
            ext_expect_expect(reason.message).to.be('Login requires an interactive shell');
            ext_expect_expect(reason.code).to.be('ENOINT');
        });
    });

    it('succeeds if run in non-interactive shell with token passed', function() {
        return helpers_helpersjsjs.run(login, [{ token: 'foobar' }]);
    });

    it('succeeds if provided password is valid', function() {
        var login = loginFactory({});

        var logger = login({}, { interactive: true });

        logger.once('prompt', function(prompt, answer) {
            answer({
                username: 'user',
                password: 'validpassword'
            });
        });

        return helpers_helpersjsjs.expectEvent(logger, 'end').spread(function(options) {
            ext_expect_expect(options.token).to.be('faketoken');
        });
    });

    it('supports two-factor authorization', function() {
        var login = loginFactory({});

        var logger = login({}, { interactive: true });

        logger.once('prompt', function(prompt, answer) {
            logger.once('prompt', function(prompt, answer) {
                answer({
                    otpcode: '123456'
                });
            });

            answer({
                username: 'user',
                password: 'withtwofactor'
            });
        });

        return helpers_helpersjsjs.expectEvent(logger, 'end').spread(function(options) {
            ext_expect_expect(options.token).to.be('faketwoauthtoken');
        });
    });

    it('fails if provided password is invalid', function() {
        var login = loginFactory({});

        var logger = login({}, { interactive: true });

        logger.once('prompt', function(prompt, answer) {
            answer({
                username: 'user',
                password: 'invalidpassword'
            });
        });

        return helpers_helpersjsjs.expectEvent(logger, 'error').spread(function(error) {
            ext_expect_expect(error.code).to.be('EAUTH');
            ext_expect_expect(error.message).to.be('Authorization failed');
        });
    });

    it('uses username stored in config as default username', function() {
        var login = loginFactory({
            get: function(key) {
                if (key === 'username') {
                    return 'savedusername';
                }
            }
        });

        var logger = login({}, { interactive: true });

        return helpers_helpersjsjs
            .expectEvent(logger, 'prompt')
            .spread(function(prompt, answer) {
                ext_expect_expect(prompt[0].default).to.be('savedusername');
            });
    });

    it('saves username in config', function(done) {
        var login = loginFactory({
            set: function(key, value) {
                if (key === 'username') {
                    ext_expect_expect(value).to.be('user');
                    done();
                }
            }
        });

        var logger = login({}, { interactive: true });

        logger.once('prompt', function(prompt, answer) {
            answer({
                username: 'user',
                password: 'validpassword'
            });
        });
    });

    it('saves received token in accessToken config', function(done) {
        var login = loginFactory({
            set: function(key, value) {
                if (key === 'accessToken') {
                    ext_expect_expect(value).to.be('faketoken');
                    done();
                }
            }
        });

        var logger = login({}, { interactive: true });

        logger.once('prompt', function(prompt, answer) {
            answer({
                username: 'user',
                password: 'validpassword'
            });
        });
    });
});
