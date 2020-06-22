var condense_condense = condense;
import ext_mout_mout from "mout";
var leadLinesRegExp = /^\r?\n/;
var multipleLinesRegExp = /\r?\n(\r?\n)+/gm;

function condense(Handlebars) {
    Handlebars.registerHelper('condense', function(context) {
        var str = context.fn(this);

        // Remove multiple lines
        str = str.replace(multipleLinesRegExp, '$1');

        // Remove leading new lines (while keeping indentation)
        str = str.replace(leadLinesRegExp, '');

        // Remove trailing whitespaces (including new lines);
        str = ext_mout_mout.string.rtrim(str);

        return str;
    });
}

export { condense_condense as condense };
