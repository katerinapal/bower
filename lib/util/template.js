import ext_path_path from "path";
import { fs as fs_fsjs } from "./fs";
import ext_handlebars_Handlebars from "handlebars";
import ext_mout_mout from "mout";
import { indexjs as templatesindex_indexjsjs } from "../templates/helpers";

var templatesDir = ext_path_path.resolve(__dirname, '../templates');
var cache = {};

// Register helpers
ext_mout_mout.object.forOwn(templatesindex_indexjsjs, function(register) {
    register(ext_handlebars_Handlebars);
});

function render(name, data, escape) {
    var contents;

    // Check if already compiled
    if (cache[name]) {
        return cache[name](data);
    }

    // Otherwise, read the file, compile and cache
    contents = fs_fsjs.readFileSync(ext_path_path.join(templatesDir, name)).toString();
    cache[name] = ext_handlebars_Handlebars.compile(contents, {
        noEscape: !escape
    });

    // Call the function again
    return render(name, data, escape);
}

function exists(name) {
    if (cache[name]) {
        return true;
    }

    return fs_fsjs.existsSync(ext_path_path.join(templatesDir, name));
}

module.exports = {
    render: render,
    exists: exists
};
export { templatejs_templatejs as templatejs };
