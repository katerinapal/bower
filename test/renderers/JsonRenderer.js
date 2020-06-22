import ext_chai_chai from "chai";
import * as helpers_helpersjsjs from "../helpers";
import ext_multiline_multiline from "multiline";
var expect = ext_chai_chai.expect;
var multiline = ext_multiline_multiline.stripIndent;

var JsonRenderer = helpers_helpersjsjs.require('lib/renderers/JsonRenderer');

var jsonRendererWithPrompt = function(stubs) {
    return helpers_helpersjsjs.require('lib/renderers/JsonRenderer', {
        promptly: stubs
    });
};

// When cloning on Windows it's possible carrets are used
var normalize = function(string) {
    return string.replace(/\r\n|\r/g, '\n');
};

describe('JsonRenderer', function() {
    it('logs simple message to stderr', function() {
        return helpers_helpersjsjs
            .capture(function() {
                var renderer = new JsonRenderer();
                renderer.log({
                    id: 'foobar',
                    message: 'hello world'
                });

                renderer.end();
            })
            .spread(function(stdout, stderr) {
                expect(stderr).to.eq(
                    normalize(
                        multiline(function() {
                            /*
                [{
                  "id": "foobar",
                  "message": "hello world"
                }]

            */
                        })
                    )
                );
            });
    });

    it('logs error message to stderr', function() {
        return helpers_helpersjsjs
            .capture(function() {
                var renderer = new JsonRenderer();
                renderer.error({
                    id: 'foobar',
                    message: 'hello world',
                    data: {
                        foo: 'bar'
                    },
                    stacktrace: ['./foo:23', './bar:23']
                });
            })
            .spread(function(stdout, stderr) {
                expect(stderr).to.eq(
                    normalize(
                        multiline(function() {
                            /*
                [{
                  "id": "error",
                  "data": {
                    "foo": "bar"
                  },
                  "stacktrace": "N/A",
                  "level": "error",
                  "message": "hello world"
                }]

            */
                        })
                    )
                );
            });
    });

    it('prompts for answer', function() {
        var JsonRenderer = jsonRendererWithPrompt({
            prompt: function(name, opts, callback) {
                callback(null, 'something2');
            }
        });

        var renderer = new JsonRenderer();

        return helpers_helpersjsjs
            .capture(function() {
                return renderer
                    .prompt([
                        {
                            type: 'input',
                            name: 'field',
                            message: 'Please enter something',
                            default: 'something'
                        }
                    ])
                    .then(function(response) {
                        expect(response.field).to.eq('something2');
                        renderer.end();
                    });
            })
            .spread(function(stdout, stderr) {
                expect(stderr).to.eq(
                    normalize(
                        multiline(function() {
                            /*
                [{
                  "type": "input",
                  "name": "field",
                  "message": "Please enter something",
                  "default": "something",
                  "level": "prompt"
                }]

            */
                        })
                    )
                );
            });
    });
});
