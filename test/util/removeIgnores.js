import ext_expect_expect from "expect.js";
import * as helpers_TempDirjs from "../helpers";
import ext_glob_glob from "glob";
import ext_q_Q from "q";
import { removeIgnores as libutilremoveIgnores_removeIgnoresjs } from "../../lib/util/removeIgnores";

describe('removeIgnores', function() {
    var tempDir = new helpers_TempDirjs.TempDir({
        'bower.json': {},
        'index.js': 'Not to ignore',
        'node_modules/underscore/index.js': 'Should be ignored'
    });

    var ignoreTest = function(dir, meta, leftovers) {
        tempDir.prepare();

        var deferred = ext_q_Q.defer();

        libutilremoveIgnores_removeIgnoresjs(dir, meta).then(function() {
            ext_glob_glob('**/*.*', { cwd: dir }, function(cb, files) {
                ext_expect_expect(files).to.eql(leftovers);
                deferred.resolve();
            });
        });

        return deferred.promise;
    };

    it('removes all files in directory', function() {
        return ignoreTest(tempDir.path, { ignore: ['node_modules/**/*'] }, [
            'bower.json',
            'index.js'
        ]);
    });

    it('removes whole directory', function() {
        return ignoreTest(tempDir.path, { ignore: ['node_modules/'] }, [
            'bower.json',
            'index.js'
        ]);
    });

    it('removes whole directory (no ending slash)', function() {
        return ignoreTest(tempDir.path, { ignore: ['node_modules'] }, [
            'bower.json',
            'index.js'
        ]);
    });

    it('removes all but one file', function() {
        return ignoreTest(tempDir.path, { ignore: ['**/*', '!bower.json'] }, [
            'bower.json'
        ]);
    });

    it('refuses to ignore bower.json', function() {
        return ignoreTest(tempDir.path, { ignore: ['**/*', '!index.js'] }, [
            'bower.json',
            'index.js'
        ]);
    });

    it('removes all but one file deep down the tree', function() {
        return ignoreTest(
            tempDir.path,
            { ignore: ['**/*', '!node_modules/underscore/index.js'] },
            ['bower.json', 'node_modules/underscore/index.js']
        );
    });
});
