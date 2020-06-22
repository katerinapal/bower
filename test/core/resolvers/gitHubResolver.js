import ext_path_path from "path";
import ext_nock_nock from "nock";
import { fs as libutilfs_fsjs } from "../../../lib/util/fs";
import ext_expect_expect from "expect.js";
import ext_bowerlogger_Logger from "bower-logger";
import { GitRemoteResolver as libcoreresolversGitRemoteResolver_GitRemoteResolverjs } from "../../../lib/core/resolvers/GitRemoteResolver";
import { GitHubResolver as libcoreresolversGitHubResolver_GitHubResolverjs } from "../../../lib/core/resolvers/GitHubResolver";
import { defaultConfig as libconfig_defaultConfigjs } from "../../../lib/config";

describe('GitHub', function() {
    var logger;
    var testPackage = ext_path_path.resolve(__dirname, '../../assets/package-a');

    before(function() {
        logger = new ext_bowerlogger_Logger();
    });

    afterEach(function() {
        logger.removeAllListeners();
    });

    function create(decEndpoint) {
        if (typeof decEndpoint === 'string') {
            decEndpoint = { source: decEndpoint };
        }

        return new libcoreresolversGitHubResolver_GitHubResolverjs(
            decEndpoint,
            libconfig_defaultConfigjs({ strictSsl: false }),
            logger
        );
    }

    describe('.constructor', function() {
        it.skip('should throw an error on invalid GitHub URLs');

        it('should ensure .git in the source', function() {
            var resolver;

            resolver = create('git://github.com/twitter/bower');
            ext_expect_expect(resolver.getSource()).to.equal(
                'git://github.com/twitter/bower.git'
            );

            resolver = create('git://github.com/twitter/bower.git');
            ext_expect_expect(resolver.getSource()).to.equal(
                'git://github.com/twitter/bower.git'
            );

            resolver = create('git://github.com/twitter/bower.git/');
            ext_expect_expect(resolver.getSource()).to.equal(
                'git://github.com/twitter/bower.git'
            );
        });
    });

    describe('.resolve', function() {
        it('should download and extract the .tar.gz archive from GitHub.com', function(next) {
            var resolver;

            ext_nock_nock('https://github.com')
                .get('/IndigoUnited/js-events-emitter/archive/0.1.0.tar.gz')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-tar.tar.gz')
                );

            resolver = create({
                source: 'git://github.com/IndigoUnited/js-events-emitter.git',
                target: '0.1.0'
            });

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, '.bower.json'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar.tar.gz'))
                    ).to.be(false);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar.tar'))
                    ).to.be(false);
                    next();
                })
                .done();
        });

        it('should retry using the GitRemoteResolver mechanism if download failed', function(next) {
            this.timeout(20000);

            var resolver;
            var retried;

            ext_nock_nock('https://github.com')
                .get('/IndigoUnited/js-events-emitter/archive/0.1.0.tar.gz')
                .reply(200, 'this is not a valid tar');

            logger.on('log', function(entry) {
                if (entry.level === 'warn' && entry.id === 'retry') {
                    retried = true;
                }
            });

            resolver = create({
                source: 'git://github.com/IndigoUnited/js-events-emitter.git',
                target: '0.1.0'
            });

            // Monkey patch source to file://
            resolver._source = 'file://' + testPackage;

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(retried).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    next();
                })
                .done();
        });

        it('should retry using the GitRemoteResolver mechanism if extraction failed', function(next) {
            this.timeout(20000);

            var resolver;
            var retried;

            ext_nock_nock('https://github.com')
                .get('/IndigoUnited/js-events-emitter/archive/0.1.0.tar.gz')
                .reply(500);

            logger.on('log', function(entry) {
                if (entry.level === 'warn' && entry.id === 'retry') {
                    retried = true;
                }
            });

            resolver = create({
                source: 'git://github.com/IndigoUnited/js-events-emitter.git',
                target: '0.1.0'
            });

            // Monkey patch source to file://
            resolver._source = 'file://' + testPackage;

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(retried).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    next();
                })
                .done();
        });

        it('should fallback to the GitRemoteResolver mechanism if resolution is not a tag', function(next) {
            var resolver = create({
                source: 'git://github.com/foo/bar.git',
                target: '2af02ac6ddeaac1c2f4bead8d6287ce54269c039'
            });
            var originalCheckout = libcoreresolversGitRemoteResolver_GitRemoteResolverjs.prototype._checkout;
            var called;

            libcoreresolversGitRemoteResolver_GitRemoteResolverjs.prototype._checkout = function() {
                called = true;
                return originalCheckout.apply(this, arguments);
            };

            // Monkey patch source to file://
            resolver._source = 'file://' + testPackage;

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'baz'))).to.be(true);
                    ext_expect_expect(called).to.be(true);
                    next();
                })
                .fin(function() {
                    libcoreresolversGitRemoteResolver_GitRemoteResolverjs.prototype._checkout = originalCheckout;
                })
                .done();
        });

        it.skip('it should error out if the status code is not within 200-299');

        it.skip('should report progress if it takes too long to download');
    });

    describe('._savePkgMeta', function() {
        it.skip('should guess the homepage if not already set');
    });
});
