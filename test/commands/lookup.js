import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";

var lookup = helpers_helpersjsjs.command('lookup');

describe('bower lookup', function() {
    var lookupWithResult = function(response) {
        return helpers_helpersjsjs.command('lookup', {
            '../core/PackageRepository': function() {
                return {
                    getRegistryClient: function() {
                        return {
                            lookup: function(query, callback) {
                                if (query in response) {
                                    callback(null, response[query]);
                                } else {
                                    callback();
                                }
                            }
                        };
                    }
                };
            }
        });
    };

    it('correctly reads arguments', function() {
        ext_expect_expect(lookup.readOptions(['jquery'])).to.eql(['jquery']);
    });

    it('lookups package by name', function() {
        var lookup = lookupWithResult({ jquery: { url: 'http://jquery.org' } });

        return helpers_helpersjsjs.run(lookup, ['jquery']).spread(function(result) {
            ext_expect_expect(result).to.eql({
                name: 'jquery',
                url: 'http://jquery.org'
            });
        });
    });

    it('returns null if no package is found', function() {
        var lookup = lookupWithResult({ jquery: { url: 'http://jquery.org' } });

        return helpers_helpersjsjs.run(lookup, ['foobar']).spread(function(result) {
            ext_expect_expect(result).to.eql(null);
        });
    });

    it('returns null if called without argument', function() {
        var lookup = lookupWithResult({ jquery: { url: 'http://jquery.org' } });

        return helpers_helpersjsjs.run(lookup, []).spread(function(result) {
            ext_expect_expect(result).to.eql(null);
        });
    });
});
