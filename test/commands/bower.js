import ext_expect_expect from "expect.js";
import * as helpers_runBin from "../helpers";
var runBin = helpers_runBin.runBin;

describe('bower', function() {
    process.env.CI = '1';

    it('runs bower installation', function() {
        var result = runBin();
        var text = result.stdout.toString();

        ext_expect_expect(text).to.contain('Usage:');
        ext_expect_expect(text).to.contain('Commands:');
    });
});

describe('abbreviations', function() {
    it('Returns same value than the full command', function() {
        var abbr = runBin(['install']);
        var full = runBin(['i']);

        ext_expect_expect(abbr.stdout.toString()).to.be.equal(full.stdout.toString());
    });
});
