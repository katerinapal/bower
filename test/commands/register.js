import ext_q_Q from "q";
import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";

var register = helpers_helpersjsjs.command('register');

var fakeRepositoryFactory = function(canonicalDir, pkgMeta) {
    function FakeRepository() {}

    FakeRepository.prototype.fetch = function() {
        return ext_q_Q.fcall(function() {
            return [canonicalDir, pkgMeta];
        });
    };

    FakeRepository.prototype.getRegistryClient = function() {
        return {
            register: function(name, url, cb) {
                cb(null, { name: name, url: url });
            }
        };
    };

    return FakeRepository;
};

var register = helpers_helpersjsjs.command('register');

var registerFactory = function(canonicalDir, pkgMeta) {
    return helpers_helpersjsjs.command('register', {
        '../core/PackageRepository': fakeRepositoryFactory(
            canonicalDir,
            pkgMeta
        )
    });
};

describe('bower register', function() {
    var mainPackage = new helpers_helpersjsjs.TempDir({
        'bower.json': {
            name: 'package'
        }
    });

    it('correctly reads arguments', function() {
        ext_expect_expect(register.readOptions(['jquery', 'url'])).to.eql([
            'jquery',
            'url'
        ]);
    });

    it('errors if name is not provided', function() {
        return helpers_helpersjsjs.run(register).fail(function(reason) {
            ext_expect_expect(reason.message).to.be('Usage: bower register <name> <url>');
            ext_expect_expect(reason.code).to.be('EINVFORMAT');
        });
    });

    it('errors if url is not provided', function() {
        return helpers_helpersjsjs.run(register, ['some-name']).fail(function(reason) {
            ext_expect_expect(reason.message).to.be('Usage: bower register <name> <url>');
            ext_expect_expect(reason.code).to.be('EINVFORMAT');
        });
    });

    it('errors if trying to register private package', function() {
        mainPackage.prepare({ 'bower.json': { private: true } });

        var register = registerFactory(mainPackage.path, mainPackage.meta());
        return helpers_helpersjsjs
            .run(register, ['some-name', 'git://fake-url.git'])
            .fail(function(reason) {
                ext_expect_expect(reason.message).to.be(
                    'The package you are trying to register is marked as private'
                );
                ext_expect_expect(reason.code).to.be('EPRIV');
            });
    });

    it('should call registry client with name and url', function() {
        mainPackage.prepare();

        var register = registerFactory(mainPackage.path, mainPackage.meta());
        return helpers_helpersjsjs
            .run(register, ['some-name', 'git://fake-url.git'])
            .spread(function(result) {
                ext_expect_expect(result).to.eql({
                    // Result from register action on stub
                    name: 'some-name',
                    url: 'git://fake-url.git'
                });
            });
    });

    it('should call registry client with name and github source', function() {
        mainPackage.prepare();

        var register = registerFactory(mainPackage.path, mainPackage.meta());
        return helpers_helpersjsjs
            .run(register, ['some-name', 'some-name/repo'])
            .spread(function(result) {
                ext_expect_expect(result).to.eql({
                    // Result from register action on stub
                    name: 'some-name',
                    url: 'git@github.com:some-name/repo.git'
                });
            });
    });

    it('should support single-char github names', function() {
        mainPackage.prepare();

        var register = registerFactory(mainPackage.path, mainPackage.meta());
        return helpers_helpersjsjs
            .run(register, ['some-name', 'a/b'])
            .spread(function(result) {
                ext_expect_expect(result).to.eql({
                    // Result from register action on stub
                    name: 'some-name',
                    url: 'git@github.com:a/b.git'
                });
            });
    });

    it('should confirm in interactive mode', function() {
        mainPackage.prepare();

        var register = registerFactory(mainPackage.path, mainPackage.meta());

        var promise = helpers_helpersjsjs.run(register, [
            'some-name',
            'git://fake-url.git',
            { interactive: true }
        ]);

        return helpers_helpersjsjs
            .expectEvent(promise.logger, 'confirm')
            .spread(function(e) {
                ext_expect_expect(e.type).to.be('confirm');
                ext_expect_expect(e.message).to.be(
                    'Registering a package will make it installable via the registry (https://registry.bower.io), continue?'
                );
                ext_expect_expect(e.default).to.be(true);
            });
    });

    it('should skip confirming when forcing', function() {
        mainPackage.prepare();

        var register = registerFactory(mainPackage.path, mainPackage.meta());

        return helpers_helpersjsjs.run(register, [
            'some-name',
            'git://fake-url.git',
            { interactive: true, force: true }
        ]);
    });
});
