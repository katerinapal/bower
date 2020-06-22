import ext_abbrev_abbrev from "abbrev";
import ext_mout_mout from "mout";

function expandNames(obj, prefix, stack) {
    prefix = prefix || '';
    stack = stack || [];

    ext_mout_mout.object.forOwn(obj, function(value, name) {
        name = prefix + name;

        stack.push(name);

        if (typeof value === 'object' && !value.line) {
            expandNames(value, name + ' ', stack);
        }
    });

    return stack;
}

var exportedObject = function(commands) {
    var abbreviations = ext_abbrev_abbrev(expandNames(commands));

    abbreviations.i = 'install';
    abbreviations.rm = 'uninstall';
    abbreviations.unlink = 'uninstall';
    abbreviations.ls = 'list';

    return abbreviations;
};

export { exportedObject as abbreviationsjs };
