import ext_path_path from "path";
import ext_q_Q from "q";
import ext_fs_fs from "fs";
import ext_expect_expect from "expect.js";
import * as helpers_TempDirjs from "../helpers";
import { createLink as libutilcreateLink_createLinkjs } from "../../lib/util/createLink";

describe('createLink', function() {
    var srcDir = new helpers_TempDirjs.TempDir({
        someFile: 'Hello World',
        someDirectory: {
            otherFile: 'Hello World'
        }
    });

    var dstDir = new helpers_TempDirjs.TempDir();

    beforeEach(function() {
        srcDir.prepare();
        dstDir.prepare();
    });

    it('creates a symlink to a file', function() {
        var src = ext_path_path.join(srcDir.path, 'someFile'),
            dst = ext_path_path.join(dstDir.path, 'someFile');

        return libutilcreateLink_createLinkjs(src, dst).then(function() {
            return ext_q_Q.nfcall(ext_fs_fs.readlink, dst).then(function(linkString) {
                ext_expect_expect(linkString).to.be.equal(src);
            });
        });
    });

    it('throws an error when destination already exists', function() {
        var src = ext_path_path.join(srcDir.path, 'someFile'),
            dst = ext_path_path.join(dstDir.path);

        var deferred = ext_q_Q.defer();

        libutilcreateLink_createLinkjs(src, dst)
            .catch(function(err) {
                ext_expect_expect(err.code).to.be.equal('EEXIST');
                deferred.resolve();
            })
            .then(function() {
                deferred.reject();
            });

        return deferred.promise;
    });
});
