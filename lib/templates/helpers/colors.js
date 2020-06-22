var colors_colors = colors;
import ext_chalk_chalk from "chalk";

var templateColors = ['yellow', 'green', 'cyan', 'red', 'white', 'magenta'];

function colors(Handlebars) {
    templateColors.forEach(function(color) {
        Handlebars.registerHelper(color, function(context) {
            return ext_chalk_chalk[color](context.fn(this));
        });
    });
}

export { colors_colors as colors };
