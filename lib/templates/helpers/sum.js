var sum_sum = sum;
function sum(Handlebars) {
    Handlebars.registerHelper('sum', function(val1, val2) {
        return val1 + val2;
    });
}

export { sum_sum as sum };
