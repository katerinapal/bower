import ext_path_path from "path";
import ext_expect_expect from "expect.js";
import { relativeToBaseDir as libutilrelativeToBaseDir_relativeToBaseDirjs } from "../../lib/util/relativeToBaseDir";

describe('relativeToBaseDir', function() {
    var joinOrReturnAbsolutePath = libutilrelativeToBaseDir_relativeToBaseDirjs('/tmp');

    it('returns a partial function that joins paths of the partials first arguments', function() {
        ext_expect_expect(joinOrReturnAbsolutePath('foo')).to.be.equal(
            ext_path_path.resolve('/tmp/foo')
        );
        ext_expect_expect(joinOrReturnAbsolutePath('./foo')).to.be.equal(
            ext_path_path.resolve('/tmp/foo')
        );
    });

    it("returns a partial function that returns it's first argument when it begins with /", function() {
        ext_expect_expect(joinOrReturnAbsolutePath('/foo')).to.be.equal(
            ext_path_path.resolve('/foo')
        );
        ext_expect_expect(joinOrReturnAbsolutePath('/foo/bar')).to.be.equal(
            ext_path_path.resolve('/foo/bar')
        );
    });
});
