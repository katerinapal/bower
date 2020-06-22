import ext_q_Q from "q";
import ext_expect_expect from "expect.js";
import * as helpers_helpersjsjs from "../helpers";

var search = helpers_helpersjsjs.command('search');

describe('bower search', function() {
    it('correctly reads arguments', function() {
        ext_expect_expect(search.readOptions(['jquery'])).to.eql(['jquery']);
    });

    it('searches for single repository', function() {
        return ext_q_Q.Promise(function(resolve) {
            var search = helpers_helpersjsjs.command('search', {
                '../core/PackageRepository': function() {
                    return {
                        getRegistryClient: function() {
                            return {
                                search: resolve
                            };
                        }
                    };
                }
            });

            helpers_helpersjsjs.run(search, ['jquery'], {});
        }).then(function(query) {
            ext_expect_expect(query).to.be('jquery');
        });
    });

    it('lists all repositories when no query given in non-interactive mode', function() {
        var nonInteractiveConfig = { interactive: false };

        return ext_q_Q.Promise(function(resolve) {
            var search = helpers_helpersjsjs.command('search', {
                '../core/PackageRepository': function() {
                    return {
                        getRegistryClient: function() {
                            return {
                                list: resolve
                            };
                        }
                    };
                }
            });

            helpers_helpersjsjs.run(search, [null, nonInteractiveConfig]);
        });
    });

    it('lists all repositories when no query given and config.json is enabled in interactive mode', function() {
        var interactiveConfig = { interactive: true, json: true };

        var search = helpers_helpersjsjs.command('search', {
            '../core/PackageRepository': function() {
                return {
                    getRegistryClient: function() {
                        return {
                            list: function(cb) {
                                return cb(null, 'foobar');
                            }
                        };
                    }
                };
            }
        });

        return helpers_helpersjsjs
            .run(search, [null, interactiveConfig])
            .spread(function(result) {
                ext_expect_expect(result).to.be('foobar');
            });
    });

    it('does not list any repositories in interactive mode if no query given and config.json is disabled', function() {
        var interactiveConfig = { interactive: true };

        var search = helpers_helpersjsjs.command('search', {
            '../core/PackageRepository': function() {
                return {
                    getRegistryClient: function() {
                        return {
                            list: function() {
                                throw 'list called';
                            },
                            search: function() {
                                throw 'search called';
                            }
                        };
                    }
                };
            }
        });

        return helpers_helpersjsjs
            .run(search, [null, interactiveConfig])
            .then(function(commandResult) {
                ext_expect_expect().fail('should fail');
            })
            .catch(function(e) {
                ext_expect_expect(e.code).to.be('EREADOPTIONS');
            });
    });
});
