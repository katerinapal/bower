import ext_expect_expect from "expect.js";
import ext_path_path from "path";
import { fs as libutilfs_fsjs } from "../../../lib/util/fs";
import ext_nock_nock from "nock";
import ext_q_Q from "q";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../../../lib/util/rimraf";
import ext_mkdirp_mkdirp from "mkdirp";
import ext_bowerlogger_Logger from "bower-logger";
import { cmd as libutilcmd_cmdjs } from "../../../lib/util/cmd";
import { UrlResolver as libcoreresolversUrlResolver_UrlResolverjs } from "../../../lib/core/resolvers/UrlResolver";
import { defaultConfig as libconfig_defaultConfigjs } from "../../../lib/config";

describe('UrlResolver', function() {
    var testPackage = ext_path_path.resolve(__dirname, '../../assets/package-a');
    var tempDir = ext_path_path.resolve(__dirname, '../../tmp/tmp');
    var logger;

    before(function(next) {
        logger = new ext_bowerlogger_Logger();

        // Checkout test package version 0.2.1
        libutilcmd_cmdjs('git', ['checkout', '0.2.1'], { cwd: testPackage }).then(
            next.bind(next, null),
            next
        );
    });

    afterEach(function() {
        logger.removeAllListeners();
    });

    function create(decEndpoint) {
        if (typeof decEndpoint === 'string') {
            decEndpoint = { source: decEndpoint };
        }

        return new libcoreresolversUrlResolver_UrlResolverjs(decEndpoint, libconfig_defaultConfigjs(), logger);
    }

    describe('.constructor', function() {
        it('should guess the name from the URL', function() {
            var resolver = create('http://bower.io/foo.txt');

            ext_expect_expect(resolver.getName()).to.equal('foo');
        });

        it('should remove ?part from the URL when guessing the name', function() {
            var resolver = create('http://bower.io/foo.txt?bar');

            ext_expect_expect(resolver.getName()).to.equal('foo');
        });

        it('should not guess the name or remove ?part from the URL if not guessing', function() {
            var resolver = create({
                source: 'http://bower.io/foo.txt?bar',
                name: 'baz'
            });

            ext_expect_expect(resolver.getName()).to.equal('baz');
        });

        it('should error out if a target was specified', function(next) {
            var resolver;

            try {
                resolver = create({ source: testPackage, target: '0.0.1' });
            } catch (err) {
                ext_expect_expect(err).to.be.an(Error);
                ext_expect_expect(err.message).to.match(/can\'t resolve targets/i);
                ext_expect_expect(err.code).to.equal('ENORESTARGET');
                return next();
            }

            next(new Error('Should have thrown'));
        });
    });

    describe('.hasNew', function() {
        before(function() {
            ext_mkdirp_mkdirp.sync(tempDir);
        });

        afterEach(function(next) {
            libutilrimraf_rimrafjsjs(ext_path_path.join(tempDir, '.bower.json'), next);
        });

        after(function(next) {
            libutilrimraf_rimrafjsjs(tempDir, next);
        });

        it('should resolve to true if the response is not in the 2xx range', function(next) {
            var resolver = create('http://bower.io/foo.js');

            ext_nock_nock('http://bower.io')
                .head('/foo.js')
                .reply(500);

            var pkgMeta = {
                name: 'foo',
                version: '0.0.0'
            };

            resolver
                .hasNew(pkgMeta)
                .then(function(hasNew) {
                    ext_expect_expect(hasNew).to.be(true);
                    next();
                })
                .done();
        });

        it('should resolve to true if cache headers changed', function(next) {
            var resolver = create('http://bower.io/foo.js');

            ext_nock_nock('http://bower.io')
                .head('/foo.js')
                .reply(200, '', {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                });

            var pkgMeta = {
                name: 'foo',
                version: '0.0.0',
                _cacheHeaders: {
                    ETag: 'fk3454fdmmlw20i9nf',
                    'Last-Modified': 'Tue, 16 Nov 2012 13:35:29 GMT'
                }
            };

            resolver
                .hasNew(pkgMeta)
                .then(function(hasNew) {
                    ext_expect_expect(hasNew).to.be(true);
                    next();
                })
                .done();
        });

        it("should resolve to false if cache headers haven't changed", function(next) {
            var resolver = create('http://bower.io/foo.js');

            ext_nock_nock('http://bower.io')
                .head('/foo.js')
                .reply(200, '', {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                });

            var pkgMeta = {
                name: 'foo',
                version: '0.0.0',
                _cacheHeaders: {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                }
            };

            resolver
                .hasNew(pkgMeta)
                .then(function(hasNew) {
                    ext_expect_expect(hasNew).to.be(false);
                    next();
                })
                .done();
        });

        it('should resolve to true if server responds with 304 (ETag mechanism)', function(next) {
            var resolver = create('http://bower.io/foo.js');

            ext_nock_nock('http://bower.io')
                .head('/foo.js')
                .matchHeader('If-None-Match', '686897696a7c876b7e')
                .reply(304, '', {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                });

            var pkgMeta = {
                name: 'foo',
                version: '0.0.0',
                _cacheHeaders: {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                }
            };

            resolver
                .hasNew(pkgMeta)
                .then(function(hasNew) {
                    ext_expect_expect(hasNew).to.be(false);
                    next();
                })
                .done();
        });

        it('should work with redirects', function(next) {
            var redirectingUrl = 'http://redirecting-url.com';
            var redirectingToUrl = 'http://bower.io';
            var resolver;

            ext_nock_nock(redirectingUrl)
                .head('/foo.js')
                .reply(302, '', { location: redirectingToUrl + '/foo.js' });

            ext_nock_nock(redirectingToUrl)
                .head('/foo.js')
                .reply(200, 'foo contents', {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                });

            var pkgMeta = {
                name: 'foo',
                version: '0.0.0',
                _cacheHeaders: {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                }
            };

            resolver = create(redirectingUrl + '/foo.js');

            resolver
                .hasNew(pkgMeta)
                .then(function(hasNew) {
                    ext_expect_expect(hasNew).to.be(false);
                    next();
                })
                .done();
        });
    });

    describe('.resolve', function() {
        // Function to assert that the main property of the
        // package meta of a canonical dir is set to the
        // expected value
        function assertMain(dir, singleFile) {
            return ext_q_Q.nfcall(libutilfs_fsjs.readFile, ext_path_path.join(dir, '.bower.json')).then(
                function(contents) {
                    var pkgMeta = JSON.parse(contents.toString());

                    ext_expect_expect(pkgMeta.main).to.equal(singleFile);

                    return pkgMeta;
                }
            );
        }

        it('should download file, renaming it to index', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/foo.js')
                .reply(200, 'foo contents');

            resolver = create('http://bower.io/foo.js');

            resolver
                .resolve()
                .then(function(dir) {
                    var contents;

                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index.js'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(
                        false
                    );

                    contents = libutilfs_fsjs
                        .readFileSync(ext_path_path.join(dir, 'index.js'))
                        .toString();
                    ext_expect_expect(contents).to.equal('foo contents');

                    assertMain(dir, 'index.js').then(next.bind(next, null));
                })
                .done();
        });

        it('should extract if source is an archive', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/package-zip.zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-zip.zip')
                );

            resolver = create('http://bower.io/package-zip.zip');

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip.zip'))
                    ).to.be(false);
                    next();
                })
                .done();
        });

        it('should extract if source is an archive (case insensitive)', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/package-zip.ZIP')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-zip.zip')
                );

            resolver = create('http://bower.io/package-zip.ZIP');

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip.ZIP'))
                    ).to.be(false);
                    next();
                })
                .done();
        });

        it('should copy extracted folder contents if archive contains only a folder inside', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/package-zip-folder.zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(
                        __dirname,
                        '../../assets/package-zip-folder.zip'
                    )
                );

            ext_nock_nock('http://bower.io')
                .get('/package-zip.zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(
                        __dirname,
                        '../../assets/package-zip-folder.zip'
                    )
                );

            resolver = create('http://bower.io/package-zip-folder.zip');

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip-folder'))
                    ).to.be(false);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip-folder.zip'))
                    ).to.be(false);

                    resolver = create({
                        source: 'http://bower.io/package-zip.zip',
                        name: 'package-zip'
                    });

                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip.zip'))
                    ).to.be(false);

                    next();
                })
                .done();
        });

        it("should extract if source is an archive and rename to index if it's only one file inside", function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/package-zip-single-file.zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(
                        __dirname,
                        '../../assets/package-zip-single-file.zip'
                    )
                );

            resolver = create('http://bower.io/package-zip-single-file.zip');

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index.js'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip-single-file'))
                    ).to.be(false);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(
                            ext_path_path.join(dir, 'package-zip-single-file.zip')
                        )
                    ).to.be(false);

                    return assertMain(dir, 'index.js').then(
                        next.bind(next, null)
                    );
                })
                .done();
        });

        it("should extract if source is an archive and not rename to index if inside it's just a just bower.json/component.json file in it", function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/package-zip-single-bower-json.zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(
                        __dirname,
                        '../../assets/package-zip-single-bower-json.zip'
                    )
                )
                .get('/package-zip-single-component-json.zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(
                        __dirname,
                        '../../assets/package-zip-single-component-json.zip'
                    )
                );

            resolver = create(
                'http://bower.io/package-zip-single-bower-json.zip'
            );

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bower.json'))).to.be(
                        true
                    );

                    resolver = create(
                        'http://bower.io/package-zip-single-component-json.zip'
                    );
                })
                .then(function() {
                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'component.json'))
                    ).to.be(true);
                    next();
                })
                .done();
        });

        it('should rename single file from a single folder to index when source is an archive', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/package-zip-folder-single-file.zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(
                        __dirname,
                        '../../assets/package-zip-folder-single-file.zip'
                    )
                );

            resolver = create(
                'http://bower.io/package-zip-folder-single-file.zip'
            );

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index.js'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(
                            ext_path_path.join(dir, 'package-zip-folder-single-file')
                        )
                    ).to.be(false);
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(
                            ext_path_path.join(dir, 'package-zip-folder-single-file.zip')
                        )
                    ).to.be(false);

                    return assertMain(dir, 'index.js').then(
                        next.bind(next, null)
                    );
                })
                .done();
        });

        it('should extract if response content-type is an archive', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/package-zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-zip.zip'),
                {
                    'Content-Type': 'application/zip'
                }
                )

                .get('/package-zip2')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-zip.zip'),
                {
                    'Content-Type': 'application/zip; charset=UTF-8'
                }
                )

                .get('/package-zip3')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-zip.zip'),
                {
                    'Content-Type': ' application/zip ; charset=UTF-8'
                }
                )

                .get('/package-zip4')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-zip.zip'),
                {
                    'Content-Type': '"application/x-zip"' // Test with quotes
                }
                )

                .get('/package-tar')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-tar.tar.gz'),
                {
                    'Content-Type': ' application/x-tgz ; charset=UTF-8'
                }
                )

                .get('/package-tar.tar.gz')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-tar.tar.gz'),
                {
                    'Content-Type': ' application/x-tgz ; charset=UTF-8'
                }
                )

                .get('/package-tar2.tar.gz')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-tar.tar.gz'),
                {
                    'Content-Type':
                            ' application/octet-stream ; charset=UTF-8'
                }
                );

            resolver = create('http://bower.io/package-zip');

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip.zip'))
                    ).to.be(false);

                    resolver = create('http://bower.io/package-zip2');

                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip3.zip'))
                    ).to.be(false);

                    resolver = create('http://bower.io/package-zip3');

                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip4.zip'))
                    ).to.be(false);

                    resolver = create('http://bower.io/package-zip4');

                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar'))).to.be(
                        false
                    );

                    resolver = create('http://bower.io/package-tar');

                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar.tar.gz'))
                    ).to.be(false);

                    resolver = create('http://bower.io/package-tar.tar.gz');

                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar.tar.gz'))
                    ).to.be(false);

                    resolver = create('http://bower.io/package-tar2.tar.gz');

                    return resolver.resolve();
                })
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-tar.tar.gz'))
                    ).to.be(false);

                    next();
                })
                .done();
        });

        it('should extract if response content-disposition filename is an archive', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/package-zip')
                .replyWithFile(
                    200,
                    ext_path_path.resolve(__dirname, '../../assets/package-zip.zip'),
                {
                    'Content-Disposition':
                            'attachment; filename="package-zip.zip"'
                }
                );

            resolver = create('http://bower.io/package-zip');

            resolver
                .resolve()
                .then(function(dir) {
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(true);
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip.zip'))
                    ).to.be(false);
                    next();
                })
                .done();
        });

        it("should save the release if there's a E-Tag", function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/foo.js')
                .reply(200, 'foo contents', {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                });

            resolver = create('http://bower.io/foo.js');

            resolver
                .resolve()
                .then(function(dir) {
                    assertMain(dir, 'index.js').then(function(pkgMeta) {
                        ext_expect_expect(pkgMeta._release).to.equal('e-tag:686897696a');
                        next();
                    });
                })
                .done();
        });

        it('should allow for query strings in URL', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/foo.js?bar=baz')
                .reply(200, 'foo contents');

            resolver = create('http://bower.io/foo.js?bar=baz');

            resolver
                .resolve()
                .then(function(dir) {
                    var contents;

                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index.js'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(
                        false
                    );
                    ext_expect_expect(
                        libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js?bar=baz'))
                    ).to.be(false);

                    contents = libutilfs_fsjs
                        .readFileSync(ext_path_path.join(dir, 'index.js'))
                        .toString();
                    ext_expect_expect(contents).to.equal('foo contents');

                    assertMain(dir, 'index.js').then(next.bind(next, null));
                })
                .done();
        });

        it('should save cache headers', function(next) {
            var resolver;

            ext_nock_nock('http://bower.io')
                .get('/foo.js')
                .reply(200, 'foo contents', {
                    ETag: '686897696a7c876b7e',
                    'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                });

            resolver = create('http://bower.io/foo.js');

            resolver
                .resolve()
                .then(function(dir) {
                    assertMain(dir, 'index.js').then(function(pkgMeta) {
                        ext_expect_expect(pkgMeta._cacheHeaders).to.eql({
                            ETag: '686897696a7c876b7e',
                            'Last-Modified': 'Tue, 15 Nov 2012 12:45:26 GMT'
                        });
                        next();
                    });
                })
                .done();
        });

        it('should work with redirects', function(next) {
            var redirectingUrl = 'http://redirecting-url.com';
            var redirectingToUrl = 'http://bower.io';
            var resolver;

            ext_nock_nock(redirectingUrl)
                .get('/foo.js')
                .reply(302, '', {
                    location: redirectingToUrl + '/foo.js'
                });

            ext_nock_nock(redirectingToUrl)
                .get('/foo.js')
                .reply(200, 'foo contents');

            resolver = create(redirectingUrl + '/foo.js');

            resolver
                .resolve()
                .then(function(dir) {
                    var contents;

                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index.js'))).to.be(
                        true
                    );
                    ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(
                        false
                    );

                    contents = libutilfs_fsjs
                        .readFileSync(ext_path_path.join(dir, 'index.js'))
                        .toString();
                    ext_expect_expect(contents).to.equal('foo contents');

                    assertMain(dir, 'index.js').then(next.bind(next, null));
                })
                .done();
        });

        it.skip('it should error out if the status code is not within 200-299');

        it.skip('should report progress when it takes too long to download');

        describe('content-disposition validation', function() {
            function performTest(header, extraction) {
                var resolver;

                ext_nock_nock('http://bower.io')
                    .get('/package-zip')
                    .replyWithFile(
                        200,
                        ext_path_path.resolve(__dirname, '../../assets/package-zip.zip'),
                    {
                        'Content-Disposition': header
                    }
                    );

                resolver = create('http://bower.io/package-zip');

                return resolver.resolve().then(function(dir) {
                    if (extraction) {
                        ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(
                            true
                        );
                        ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(
                            true
                        );
                        ext_expect_expect(
                            libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))
                        ).to.be(false);
                    } else {
                        ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'foo.js'))).to.be(
                            false
                        );
                        ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'bar.js'))).to.be(
                            false
                        );
                        ext_expect_expect(
                            libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'package-zip'))
                        ).to.be(false);
                        ext_expect_expect(libutilfs_fsjs.existsSync(ext_path_path.join(dir, 'index'))).to.be(
                            true
                        );
                    }
                });
            }

            it('should work with and without quotes', function(next) {
                performTest('attachment; filename="package-zip.zip"', true)
                    .then(function() {
                        return performTest(
                            'attachment; filename=package-zip.zip',
                            true
                        );
                    })
                    .then(next.bind(next, null))
                    .done();
            });

            it('should not work with partial quotes', function(next) {
                performTest('attachment; filename="package-zip.zip', false)
                    .then(function() {
                        // This one works, and the last quote is simply ignored
                        return performTest(
                            'attachment; filename=package-zip.zip"',
                            true
                        );
                    })
                    .then(next.bind(next, null))
                    .done();
            });

            it('should not work if the filename contain chars other than alphanumerical, dashes, spaces and dots', function(next) {
                performTest('attachment; filename="1package01 _-zip.zip"', true)
                    .then(function() {
                        return performTest(
                            'attachment; filename="package$%"',
                            false
                        );
                    })
                    .then(function() {
                        return performTest(
                            'attachment; filename=packagé',
                            false
                        );
                    })
                    .then(function() {
                        // This one works, but since the filename is truncated once a space is found
                        // the extraction will not happen because the file has no .zip extension
                        return performTest(
                            'attachment; filename=1package01 _-zip.zip"',
                            false
                        );
                    })
                    .then(function() {
                        return performTest(
                            'attachment; filename=1package01.zip _-zip.zip"',
                            true
                        );
                    })
                    .then(next.bind(next, null))
                    .done();
            });

            it('should trim leading and trailing spaces', function(next) {
                performTest('attachment; filename=" package.zip "', true)
                    .then(next.bind(next, null))
                    .done();
            });

            it('should not work if the filename ends with a dot', function(next) {
                performTest('attachment; filename="package.zip."', false)
                    .then(function() {
                        return performTest(
                            'attachment; filename="package.zip. "',
                            false
                        );
                    })
                    .then(function() {
                        return performTest(
                            'attachment; filename=package.zip.',
                            false
                        );
                    })
                    .then(function() {
                        return performTest(
                            'attachment; filename="package.zip ."',
                            false
                        );
                    })
                    .then(function() {
                        return performTest(
                            'attachment; filename="package.zip. "',
                            false
                        );
                    })
                    .then(next.bind(next, null))
                    .done();
            });

            it('should be case insensitive', function(next) {
                performTest('attachment; FILENAME="package.zip"', true)
                    .then(function() {
                        return performTest(
                            'attachment; filename="package.ZIP"',
                            true
                        );
                    })
                    .then(function() {
                        return performTest(
                            'attachment; FILENAME=package.zip',
                            true
                        );
                    })
                    .then(function() {
                        return performTest(
                            'attachment; filename=package.ZIP',
                            true
                        );
                    })
                    .then(next.bind(next, null))
                    .done();
            });
        });
    });

    describe('#isTargetable', function() {
        it('should return false', function() {
            ext_expect_expect(libcoreresolversUrlResolver_UrlResolverjs.isTargetable()).to.be(false);
        });
    });
});
