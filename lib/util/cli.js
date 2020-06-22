import ext_mout_mout from "mout";
import ext_nopt_nopt from "nopt";
import { indexjs as index_indexjsjs } from "../renderers";

function readOptions(options, argv) {
    var types;
    var noptOptions;
    var parsedOptions = {};
    var shorthands = {};

    if (Array.isArray(options)) {
        argv = options;
        options = {};
    } else {
        options = options || {};
    }

    types = ext_mout_mout.object.map(options, function(option) {
        return option.type;
    });
    ext_mout_mout.object.forOwn(options, function(option, name) {
        shorthands[option.shorthand] = '--' + name;
    });

    noptOptions = ext_nopt_nopt(types, shorthands, argv);

    // Filter only the specified options because nopt parses every --
    // Also make them camel case
    ext_mout_mout.object.forOwn(noptOptions, function(value, key) {
        if (options[key]) {
            parsedOptions[ext_mout_mout.string.camelCase(key)] = value;
        }
    });

    parsedOptions.argv = noptOptions.argv;

    return parsedOptions;
}

function getRenderer(command, json, config) {
    if (config.json || json) {
        return new index_indexjsjs.Json(command, config);
    }

    return new index_indexjsjs.Standard(command, config);
}

readOptions_readOptions = readOptions;
getRenderer_getRenderer = getRenderer;
var readOptions_readOptions;
export { readOptions_readOptions as readOptions };
var getRenderer_getRenderer;
export { getRenderer_getRenderer as getRenderer };
