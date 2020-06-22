import ext_expect_expect from "expect.js";
import * as helpers_TempDirjs from "../helpers";
import ext_nock_nock from "nock";
import ext_path_path from "path";
import ext_q_Q from "q";
import { fs as libutilfs_fsjs } from "../../lib/util/fs";
import { download as libutildownload_downloadjs } from "../../lib/util/download";

describe('download', function() {
    var tempDir = new helpers_TempDirjs.TempDir(),
        source = ext_path_path.resolve(__dirname, '../assets/package-tar.tar.gz'),
        destination = tempDir.getPath('package.tar.gz');

    function downloadTest(opts) {
        var deferred = ext_q_Q.defer();

        tempDir.prepare();

        opts.response(ext_nock_nock('http://bower.io', opts.nockOpts));

        libutildownload_downloadjs(
            opts.sourceUrl || 'http://bower.io/package.tar.gz',
            opts.destinationPath || destination,
            opts.downloadOpts
        )
            .then(
                function(result) {
                    if (opts.expect) {
                        opts.expect(result);
                        deferred.resolve();
                    } else {
                        deferred.reject(
                            new Error(
                                'Error expected. Got successful response.'
                            )
                        );
                    }
                },
                function(error) {
                    if (opts.expectError) {
                        opts.expectError(error);
                        deferred.resolve();
                    } else {
                        deferred.reject(error);
                    }
                }
            )
            .done();

        return deferred.promise;
    }

    it('download file to directory', function() {
        return downloadTest({
            response: function(ext_nock_nock) {
                ext_nock_nock.get('/package.tar.gz').replyWithFile(200, source);
            },
            expect: function() {
                ext_expect_expect(libutilfs_fsjs.existsSync(destination)).to.be(true);
                ext_expect_expect(libutilfs_fsjs.readdirSync(tempDir.path)).to.have.length(1);
            }
        });
    });

    it('pass custom user-agent to server', function() {
        var userAgent = 'Custom User-Agent';
        return downloadTest({
            nockOpts: {
                reqheaders: {
                    'user-agent': userAgent
                }
            },
            downloadOpts: {
                headers: {
                    'User-Agent': userAgent
                }
            },
            response: function(ext_nock_nock) {
                ext_nock_nock.get('/package.tar.gz').replyWithFile(200, source);
            },
            expect: function() {
                ext_expect_expect(libutilfs_fsjs.existsSync(destination)).to.be(true);
                ext_expect_expect(libutilfs_fsjs.readdirSync(tempDir.path)).to.have.length(1);
            }
        });
    });

    it('handle server response 404', function() {
        return downloadTest({
            response: function(ext_nock_nock) {
                ext_nock_nock.get('/package.tar.gz').reply(404);
            },
            expectError: function() {
                ext_expect_expect(libutilfs_fsjs.readdirSync(tempDir.path)).to.be.empty();
            }
        });
    });

    it('handle network error', function() {
        return downloadTest({
            response: function(ext_nock_nock) {
                ext_nock_nock.get('/package.tar.gz').replyWithError('network error');
            },
            expectError: function() {
                ext_expect_expect(libutilfs_fsjs.readdirSync(tempDir.path)).to.be.empty();
            }
        });
    });

    it('handles connection timeout', function() {
        return downloadTest({
            response: function(ext_nock_nock) {
                // First connection + 5 retries
                ext_nock_nock
                    .get('/package.tar.gz')
                    .times(6)
                    .delayConnection(1000)
                    .replyWithFile(200, source);
            },
            expectError: function(e) {
                ext_expect_expect(e.code).to.be('ESOCKETTIMEDOUT');
                ext_expect_expect(libutilfs_fsjs.readdirSync(tempDir.path)).to.be.empty();
            },
            downloadOpts: {
                timeout: 10,
                maxTimeout: 0,
                minTimeout: 0
            }
        });
    });

    it('handles socket timeout', function() {
        return downloadTest({
            response: function(ext_nock_nock) {
                // First connection + 5 retries
                ext_nock_nock
                    .get('/package.tar.gz')
                    .times(6)
                    .socketDelay(1000)
                    .replyWithFile(200, source);
            },
            expectError: function(e) {
                ext_expect_expect(e.code).to.be('ESOCKETTIMEDOUT');
                ext_expect_expect(libutilfs_fsjs.readdirSync(tempDir.path)).to.be.empty();
            },
            downloadOpts: {
                timeout: 10,
                maxTimeout: 0,
                minTimeout: 0
            }
        });
    });

    it('handles retries correctly', function() {
        return downloadTest({
            response: function(ext_nock_nock) {
                // First connection + 5 retries
                ext_nock_nock
                    .get('/package.tar.gz')
                    .times(5)
                    .delayConnection(1000)
                    .replyWithFile(200, source);
                // Success last time
                ext_nock_nock.get('/package.tar.gz').replyWithFile(200, source);
            },
            expect: function() {
                ext_expect_expect(libutilfs_fsjs.existsSync(destination)).to.be(true);
                ext_expect_expect(libutilfs_fsjs.readdirSync(tempDir.path)).to.have.length(1);
            },
            downloadOpts: {
                timeout: 10,
                maxTimeout: 0,
                minTimeout: 0
            }
        });
    });

    it('fails on incorrect Content-Length match', function() {
        return downloadTest({
            response: function(ext_nock_nock) {
                // First connection + 5 retries
                ext_nock_nock
                    .get('/package.tar.gz')
                    .replyWithFile(200, source, { 'Content-Length': 5000 });
            },
            expectError: function(e) {
                ext_expect_expect(e.code).to.be('EINCOMPLETE');
                ext_expect_expect(e.message).to.be(
                    'Transfer closed with 4636 bytes remaining to read'
                );
            },
            downloadOpts: {
                timeout: 10,
                maxTimeout: 0,
                minTimeout: 0
            }
        });
    });

    describe('gzipped files', function() {
        function testGzip(sourceFilename) {
            var sourceFile = ext_path_path.resolve(
                __dirname,
                '../assets/' + sourceFilename
            );
            var destinationPath = tempDir.getPath(sourceFilename);

            return downloadTest({
                response: function(ext_nock_nock) {
                    ext_nock_nock
                        .get('/' + sourceFilename)
                        .replyWithFile(200, sourceFile, {
                            'Content-Encoding': 'gzip'
                        });
                },
                expect: function() {
                    ext_expect_expect(libutilfs_fsjs.readFileSync(destinationPath, 'ascii')).to.be(
                        'Hello World!\n'
                    );
                },
                sourceUrl: 'http://bower.io/' + sourceFilename,
                destinationPath: destinationPath
            });
        }

        it('correctly decodes gzipped files without gz extension', function() {
            return testGzip('test-gz.txt');
        });

        it('correctly decodes gzipped files with gz extension', function() {
            return testGzip('test-gz.txt.gz');
        });
    });
});
