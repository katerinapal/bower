import ext_expect_expect from "expect.js";
import ext_path_path from "path";
import { fs as libutilfs_fsjs } from "../../../lib/util/fs";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../../../lib/util/rimraf";
import ext_bowerlogger_Logger from "bower-logger";
import { cmd as libutilcmd_cmdjs } from "../../../lib/util/cmd";
import { copyDir as libutilcopy_copyDirjs } from "../../../lib/util/copy";
import { GitFsResolver as libcoreresolversGitFsResolver_GitFsResolverjs } from "../../../lib/core/resolvers/GitFsResolver";
import { defaultConfig as libconfig_defaultConfigjs } from "../../../lib/config";

describe('GitFsResolver', function() {
    var tempSource;
    var testPackage = ext_path_path.resolve(__dirname, '../../assets/package-a');
    var logger;

    before(function() {
        logger = new ext_bowerlogger_Logger();
    });

    afterEach(function(next) {
        logger.removeAllListeners();

        if (tempSource) {
            libutilrimraf_rimrafjsjs(tempSource, next);
            tempSource = null;
        } else {
            next();
        }
    });

    function clearResolverRuntimeCache() {
        libcoreresolversGitFsResolver_GitFsResolverjs.clearRuntimeCache();
    }

    function create(decEndpoint) {
        if (typeof decEndpoint === 'string') {
            decEndpoint = { source: decEndpoint };
        }

        return new libcoreresolversGitFsResolver_GitFsResolverjs(decEndpoint, libconfig_defaultConfigjs(), logger);
    }

    describe('.constructor', function() {
        it('should guess the name from the path', function() {
            var resolver = create(testPackage);

            ext_expect_expect(resolver.getName()).to.equal('package-a');
        });

        it('should not guess the name from the path if the name was specified', function() {
            var resolver = create({ source: testPackage, name: 'foo' });

            ext_expect_expect(resolver.getName()).to.equal('foo');
        });

        it('should make paths absolute and normalized', function() {
            var resolver;

            resolver = create(ext_path_path.relative(process.cwd(), testPackage));
            ext_expect_expect(resolver.getSource()).to.equal(testPackage);

            resolver = create(testPackage + '/something/..');
            ext_expect_expect(resolver.getSource()).to.equal(testPackage);
        });

        it.skip('should use config.cwd for resolving relative paths');
    });

    describe('.resolve', function() {
        it('should checkout correctly if resolution is a branch', function(next) {
            var resolver = create({
                source: testPackage,
                target: 'some-branch'
            });

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(dir).to.be.a('string');

                    var files = libutilfs_fsjs.readdirSync(dir);
                    var fooContents;

                    ext_expect_expect(files).to.contain('foo');
                    ext_expect_expect(files).to.contain('baz');
                    ext_expect_expect(files).to.contain('baz');

                    fooContents = libutilfs_fsjs
                        .readFileSync(ext_path_path.join(dir, 'foo'))
                        .toString();
                    ext_expect_expect(fooContents).to.equal('foo foo');

                    next();
                })
                .done();
        });

        it('should checkout correctly if resolution is a tag', function(next) {
            var resolver = create({ source: testPackage, target: '~0.0.1' });

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(dir).to.be.a('string');

                    var files = libutilfs_fsjs.readdirSync(dir);

                    ext_expect_expect(files).to.contain('foo');
                    ext_expect_expect(files).to.contain('bar');
                    ext_expect_expect(files).to.not.contain('baz');

                    next();
                })
                .done();
        });

        it('should checkout correctly if resolution is a commit', function(next) {
            var resolver = create({
                source: testPackage,
                target: 'bdf51ece75e20cf404e49286727b7e92d33e9ad0'
            });

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(dir).to.be.a('string');

                    var files = libutilfs_fsjs.readdirSync(dir);

                    ext_expect_expect(files).to.not.contain('foo');
                    ext_expect_expect(files).to.not.contain('bar');
                    ext_expect_expect(files).to.not.contain('baz');
                    ext_expect_expect(files).to.contain('.master');
                    next();
                })
                .done();
        });

        it('should remove any untracked files and directories', function(next) {
            var resolver = create({
                source: testPackage,
                target: 'bdf51ece75e20cf404e49286727b7e92d33e9ad0'
            });
            var file = ext_path_path.join(testPackage, 'new-file');
            var dir = ext_path_path.join(testPackage, 'new-dir');

            libutilfs_fsjs.writeFileSync(file, 'foo');
            libutilfs_fsjs.mkdir(dir);

            function cleanup(err) {
                libutilfs_fsjs.unlinkSync(file);
                libutilfs_fsjs.rmdirSync(dir);

                if (err) {
                    throw err;
                }
            }

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(dir).to.be.a('string');

                    var files = libutilfs_fsjs.readdirSync(dir);

                    ext_expect_expect(files).to.not.contain('new-file');
                    ext_expect_expect(files).to.not.contain('new-dir');

                    cleanup();
                    next();
                })
                .fail(cleanup)
                .done();
        });

        it('should leave the original repository untouched', function(next) {
            // Switch to master
            libutilcmd_cmdjs('git', ['checkout', 'master'], { cwd: testPackage })
                // Resolve to some-branch
                .then(function() {
                    var resolver = create({
                        source: testPackage,
                        target: 'some-branch'
                    });
                    return resolver.resolve();
                })
                // Check if the original branch is still the master one
                .then(function() {
                    return libutilcmd_cmdjs('git', ['branch', '--color=never'], {
                        cwd: testPackage
                    }).spread(function(stdout) {
                        ext_expect_expect(stdout).to.contain('* master');
                    });
                })
                // Check if git status is empty
                .then(function() {
                    return libutilcmd_cmdjs('git', ['status', '--porcelain'], {
                        cwd: testPackage
                    }).spread(function(stdout) {
                        stdout = stdout.trim();
                        ext_expect_expect(stdout).to.equal('');
                        next();
                    });
                })
                .done();
        });

        it('should copy source folder permissions', function(next) {
            var mode0777;
            var resolver;

            tempSource = ext_path_path.resolve(__dirname, '../../assets/package-a-copy');
            resolver = create({ source: tempSource, target: 'some-branch' });

            libutilcopy_copyDirjs(testPackage, tempSource)
                .then(function() {
                    // Change tempSource dir to 0777
                    libutilfs_fsjs.chmodSync(tempSource, 0o777);
                    // Get the mode to a variable
                    mode0777 = libutilfs_fsjs.statSync(tempSource).mode;
                })
                .then(resolver.resolve.bind(resolver))
                .then(function(dir) {
                    // Check if temporary dir is 0777 instead of default 0777 & ~process.umask()
                    var stat = libutilfs_fsjs.statSync(dir);
                    ext_expect_expect(stat.mode).to.equal(mode0777);
                    next();
                })
                .done();
        });
    });

    describe('#refs', function() {
        afterEach(clearResolverRuntimeCache);

        it('should resolve to the references of the local repository', function(next) {
            libcoreresolversGitFsResolver_GitFsResolverjs.refs(testPackage)
                .then(function(refs) {
                    // Remove master and test only for the first 7 refs
                    refs = refs.slice(1, 8);

                    ext_expect_expect(refs).to.eql([
                        'e4655d250f2a3f64ef2d712f25dafa60652bb93e refs/heads/some-branch',
                        '0a7daf646d4fd743b6ef701d63bdbe20eee422de refs/tags/0.0.1',
                        '0791865e6f4b88f69fc35167a09a6f0626627765 refs/tags/0.0.2',
                        '2af02ac6ddeaac1c2f4bead8d6287ce54269c039 refs/tags/0.1.0',
                        '6ab264f1ba5bafa80fb0198183493e4d5b20804a refs/tags/0.1.1',
                        'c91ed7facbb695510e3e1ab86bac8b5ac159f4f3 refs/tags/0.2.0',
                        '8556e55c65722a351ca5fdce4f1ebe83ec3f2365 refs/tags/0.2.1'
                    ]);
                    next();
                })
                .done();
        });

        it('should cache the results', function(next) {
            libcoreresolversGitFsResolver_GitFsResolverjs.refs(testPackage)
                .then(function() {
                    // Manipulate the cache and check if it resolves for the cached ones
                    libcoreresolversGitFsResolver_GitFsResolverjs._cache.refs.get(testPackage).splice(0, 1);

                    // Check if it resolver to the same array
                    return libcoreresolversGitFsResolver_GitFsResolverjs.refs(testPackage);
                })
                .then(function(refs) {
                    // Test only for the first 6 refs
                    refs = refs.slice(0, 7);

                    ext_expect_expect(refs).to.eql([
                        'e4655d250f2a3f64ef2d712f25dafa60652bb93e refs/heads/some-branch',
                        '0a7daf646d4fd743b6ef701d63bdbe20eee422de refs/tags/0.0.1',
                        '0791865e6f4b88f69fc35167a09a6f0626627765 refs/tags/0.0.2',
                        '2af02ac6ddeaac1c2f4bead8d6287ce54269c039 refs/tags/0.1.0',
                        '6ab264f1ba5bafa80fb0198183493e4d5b20804a refs/tags/0.1.1',
                        'c91ed7facbb695510e3e1ab86bac8b5ac159f4f3 refs/tags/0.2.0',
                        '8556e55c65722a351ca5fdce4f1ebe83ec3f2365 refs/tags/0.2.1'
                    ]);
                    next();
                })
                .done();
        });
    });
});
