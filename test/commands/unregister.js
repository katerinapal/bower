import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";

var fakeRepositoryFactory = function() {
    function FakeRepository() {}

    FakeRepository.prototype.getRegistryClient = function() {
        return {
            unregister: function(name, cb) {
                cb(null, { name: name });
            }
        };
    };

    return FakeRepository;
};

var unregister = helpers_helpersjsjs.command('unregister');

var unregisterFactory = function() {
    return helpers_helpersjsjs.command('unregister', {
        '../core/PackageRepository': fakeRepositoryFactory()
    });
};

describe('bower unregister', function() {
    it('correctly reads arguments', function() {
        ext_expect_expect(unregister.readOptions(['jquery'])).to.eql(['jquery']);
    });

    it('errors if name is not provided', function() {
        return helpers_helpersjsjs.run(unregister).fail(function(reason) {
            ext_expect_expect(reason.message).to.be(
                'Usage: bower unregister <name> <url>'
            );
            ext_expect_expect(reason.code).to.be('EINVFORMAT');
        });
    });

    it('should call registry client with name', function() {
        var unregister = unregisterFactory();

        return helpers_helpersjsjs.run(unregister, ['some-name']).spread(function(result) {
            ext_expect_expect(result).to.eql({
                // Result from register action on stub
                name: 'some-name'
            });
        });
    });

    it('should confirm in interactive mode', function() {
        var register = unregisterFactory();

        var promise = helpers_helpersjsjs.run(register, [
            'some-name',
            {
                interactive: true,
                registry: { register: 'http://localhost' }
            }
        ]);

        return helpers_helpersjsjs
            .expectEvent(promise.logger, 'confirm')
            .spread(function(e) {
                ext_expect_expect(e.type).to.be('confirm');
                ext_expect_expect(e.message).to.be(
                    'You are about to remove component "some-name" from the bower registry (http://localhost). It is generally considered bad behavior to remove versions of a library that others are depending on. Are you really sure?'
                );
                ext_expect_expect(e.default).to.be(false);
            });
    });

    it('should skip confirming when forcing', function() {
        var register = unregisterFactory();

        return helpers_helpersjsjs.run(register, [
            'some-name',
            { interactive: true, force: true }
        ]);
    });
});
