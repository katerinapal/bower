var rpad_rpad = rpad;
import ext_mout_mout from "mout";

function rpad(Handlebars) {
    Handlebars.registerHelper('rpad', function(context) {
        var hash = context.hash;
        var minLength = parseInt(hash.minLength, 10);
        var chr = hash.char;
        return ext_mout_mout.string.rpad(context.fn(this), minLength, chr);
    });
}

export { rpad_rpad as rpad };
