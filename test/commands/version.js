import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";
var version = helpers_helpersjsjs.require('lib/commands').version;

describe('bower version', function() {
    var mainPackage = new helpers_helpersjsjs.TempDir({
        'v0.0.0': {
            'bower.json': {
                name: 'foobar'
            }
        }
    });

    it('bumps patch version', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, ['patch', {}, { cwd: mainPackage.path }])
            .then(function() {
                ext_expect_expect(mainPackage.latestGitTag()).to.be('0.0.1');
            });
    });

    it('bumps minor version', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, ['minor', {}, { cwd: mainPackage.path }])
            .then(function() {
                ext_expect_expect(mainPackage.latestGitTag()).to.be('0.1.0');
            });
    });

    it('bumps major version', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, ['major', {}, { cwd: mainPackage.path }])
            .then(function() {
                ext_expect_expect(mainPackage.latestGitTag()).to.be('1.0.0');
            });
    });

    it('changes version', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, ['1.2.3', {}, { cwd: mainPackage.path }])
            .then(function() {
                ext_expect_expect(mainPackage.latestGitTag()).to.be('1.2.3');
            });
    });

    it('returns the new version', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, ['major', {}, { cwd: mainPackage.path }])
            .then(function(results) {
                ext_expect_expect(results[0]).to.be('v1.0.0');
            });
    });

    it('fails on a dirty git repository', function() {
        mainPackage.prepareGit();
        mainPackage.create({
            'dirty.txt': 'This file has not been committed'
        });

        return helpers_helpersjsjs
            .run(version, ['patch', {}, { cwd: mainPackage.path }])
            .then(null, function(err) {
                ext_expect_expect(err).to.be.an(Error);
                ext_expect_expect(err.code).to.be('ENOTGITREPOSITORY');
            });
    });

    it('fails when the version already exists', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, ['0.0.0', {}, { cwd: mainPackage.path }])
            .then(null, function(err) {
                ext_expect_expect(err).to.be.an(Error);
                ext_expect_expect(err.code).to.be('EVERSIONEXISTS');
            });
    });

    it('fails with an invalid argument', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, ['lol', {}, { cwd: mainPackage.path }])
            .then(null, function(err) {
                ext_expect_expect(err).to.be.an(Error);
                ext_expect_expect(err.code).to.be('EINVALIDVERSION');
            });
    });

    it('bumps with custom commit message', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, [
                'patch',
                { message: 'Bumping %s, because what' },
                { cwd: mainPackage.path }
            ])
            .then(function() {
                var tags = mainPackage.git('tag');
                ext_expect_expect(tags).to.be('v0.0.0\nv0.0.1\n');
                var message = mainPackage.git(
                    'log',
                    '--pretty=format:%s',
                    '-n1'
                );
                ext_expect_expect(message).to.be('Bumping v0.0.1, because what');
            });
    });

    it('creates commit and tags', function() {
        mainPackage.prepareGit();

        return helpers_helpersjsjs
            .run(version, ['patch', {}, { cwd: mainPackage.path }])
            .then(function() {
                var tags = mainPackage.git('tag');
                ext_expect_expect(tags).to.be('v0.0.0\nv0.0.1\n');
                var message = mainPackage.git(
                    'log',
                    '--pretty=format:%s',
                    '-n1'
                );
                ext_expect_expect(message).to.be('v0.0.1');
            });
    });

    it('assumes v0.0.0 when no tags exist', function() {
        var packageWithoutTags = new helpers_helpersjsjs.TempDir({});

        packageWithoutTags.prepareGit();
        packageWithoutTags.create({
            'index.js': 'console.log("hello, world");'
        });
        packageWithoutTags.git('add', '-A');
        packageWithoutTags.git('commit', '-m"commit"');

        return helpers_helpersjsjs
            .run(version, ['major', {}, { cwd: packageWithoutTags.path }])
            .then(function() {
                ext_expect_expect(packageWithoutTags.latestGitTag()).to.be('1.0.0');
            });
    });
});
