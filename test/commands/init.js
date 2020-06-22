import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";

var init = helpers_helpersjsjs.command('init');

describe('bower init', function() {
    var mainPackage = new helpers_helpersjsjs.TempDir();

    it('correctly reads arguments', function() {
        ext_expect_expect(init.readOptions([])).to.eql([]);
    });

    it('generates bower.json file', function() {
        mainPackage.prepare();

        var logger = init({
            cwd: mainPackage.path,
            interactive: true
        });

        return helpers_helpersjsjs
            .expectEvent(logger, 'prompt')
            .spread(function(prompt, answer) {
                answer({
                    name: 'test-name',
                    description: 'test-description',
                    keywords: 'test-keyword',
                    authors: 'test-author',
                    license: 'test-license',
                    homepage: 'test-homepage',
                    private: true
                });

                return helpers_helpersjsjs.expectEvent(logger, 'prompt');
            })
            .spread(function(prompt, answer) {
                answer({ prompt: true });
                return helpers_helpersjsjs.expectEvent(logger, 'end');
            })
            .then(function() {
                ext_expect_expect(mainPackage.readJson('bower.json')).to.eql({
                    name: 'test-name',
                    homepage: 'test-homepage',
                    authors: ['test-author'],
                    description: 'test-description',
                    keywords: ['test-keyword'],
                    license: 'test-license',
                    private: true
                });
            });
    });

    it('errors on non-interactive mode', function() {
        mainPackage.prepare();

        return helpers_helpersjsjs.run(init, { cwd: mainPackage.path }).then(
            function() {
                throw 'should fail';
            },
            function(reason) {
                ext_expect_expect(reason.message).to.be(
                    'Register requires an interactive shell'
                );
                ext_expect_expect(reason.code).to.be('ENOINT');
            }
        );
    });

    it('warns about existing bower.json', function() {
        mainPackage.prepare({
            'bower.json': {
                name: 'foobar'
            }
        });

        var logger = init({ cwd: mainPackage.path, interactive: true });

        return helpers_helpersjsjs.expectEvent(logger, 'log').spread(function(event) {
            ext_expect_expect(event.level).to.be('warn');
            ext_expect_expect(event.message).to.be(
                'The existing bower.json file will be used and filled in'
            );
        });
    });

    it('gets defaults from package.json', function() {
        mainPackage.prepare({
            'package.json': {
                name: 'name-from-npm',
                description: 'description from npm',
                main: 'index.js',
                keywords: ['foo', 'bar'],
                author: 'JD Isaacks',
                license: 'ISC'
            }
        });

        var logger = init({
            cwd: mainPackage.path,
            interactive: true
        });

        return helpers_helpersjsjs
            .expectEvent(logger, 'prompt')
            .spread(function(prompt, answer) {
                // Get defaults from prompt
                var defaults = prompt.reduce(function(memo, obj) {
                    memo[obj.name] = obj['default'];
                    return memo;
                }, {});

                // Answer with defaults
                answer({
                    name: defaults.name,
                    description: defaults.description,
                    main: defaults.main,
                    keywords: defaults.keywords,
                    authors: defaults.authors,
                    license: defaults.license,
                    homepage: 'test-homepage',
                    private: true
                });

                return helpers_helpersjsjs.expectEvent(logger, 'prompt');
            })
            .spread(function(prompt, answer) {
                answer({ prompt: true });
                return helpers_helpersjsjs.expectEvent(logger, 'end');
            })
            .then(function() {
                ext_expect_expect(mainPackage.readJson('bower.json')).to.eql({
                    name: 'name-from-npm',
                    description: 'description from npm',
                    main: 'index.js',
                    keywords: ['foo', 'bar'],
                    authors: ['JD Isaacks'],
                    license: 'ISC',
                    private: true,
                    homepage: 'test-homepage'
                });
            });
    });

    it('can handle strange characters', function() {
        mainPackage.prepare({
            'package.json': {
                name: 'name/from npm'
            }
        });

        var logger = init({
            cwd: mainPackage.path,
            interactive: true
        });

        return helpers_helpersjsjs.expectEvent(logger, 'prompt');
    });
});
