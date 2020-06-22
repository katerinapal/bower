var indent_indent = indent;
import ext_mout_mout from "mout";

function indent(Handlebars) {
    Handlebars.registerHelper('indent', function(context) {
        var hash = context.hash;
        var indentStr = ext_mout_mout.string.repeat(' ', parseInt(hash.level, 10));

        return context.fn(this).replace(/\n/g, '\n' + indentStr);
    });
}

export { indent_indent as indent };
