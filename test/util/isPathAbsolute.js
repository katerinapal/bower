import ext_expect_expect from "expect.js";
import { isPathAbsolute as libutilisPathAbsolute_isPathAbsolutejs } from "../../lib/util/isPathAbsolute";

describe('isPathAbsolute', function() {
    it('returns true when a path begins with /', function() {
        ext_expect_expect(libutilisPathAbsolute_isPathAbsolutejs('/tmp/foo')).to.be.ok();
    });

    it('returns false when a path does not begin with /', function() {
        ext_expect_expect(libutilisPathAbsolute_isPathAbsolutejs('./tmp/foo')).to.not.be.ok();
    });
});
