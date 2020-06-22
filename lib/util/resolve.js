import ext_requireg_requireg from "requireg";
import ext_resolve_resolve from "resolve";

function startsWith(string, searchString, position) {
    position = position || 0;
    return string.substr(position, searchString.length) === searchString;
}

var exportedObject = function(id, options) {
    var resolvedPath;

    var cwd = (options || {}).cwd || process.cwd();

    try {
        resolvedPath = ext_resolve_resolve.sync(id, { basedir: cwd });
    } catch (e) {
        // Fallback to global require
        resolvedPath = ext_requireg_requireg.resolve(id);
    }

    return resolvedPath;
};

export { exportedObject as resolvejs };
