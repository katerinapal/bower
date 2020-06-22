import ext_q_Q from "q";
import ext_path_path from "path";
import { fs as utilfs_fsjs } from "../util/fs";
import { createError as utilcreateError_createErrorjs } from "../util/createError";
import * as utilcli_readOptionsjs from "../util/cli";

function help(logger, name, config) {
    var json;

    if (name) {
        json = ext_path_path.resolve(
            __dirname,
            '../templates/json/help-' + name.replace(/\s+/g, '/') + '.json'
        );
    } else {
        json = ext_path_path.resolve(__dirname, '../templates/json/help.json');
    }

    return ext_q_Q.promise(function(resolve) {
        utilfs_fsjs.exists(json, resolve);
    }).then(function(exists) {
        if (!exists) {
            throw utilcreateError_createErrorjs('Unknown command: ' + name, 'EUNKNOWNCMD', {
                command: name
            });
        }

        return require(json);
    });
}

// -------------------

help.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var name = options.argv.remain.slice(1).join(' ');

    return [name];
};

var encapsulated_help;

encapsulated_help = help;
