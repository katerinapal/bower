var removeIgnores_removeIgnores = removeIgnores;
import ext_path_path from "path";
import { rimrafjs as utilrimraf_rimrafjsjs } from "../util/rimraf";
import ext_fstreamignore_fstreamIgnore from "fstream-ignore";
import ext_mout_mout from "mout";
import ext_q_Q from "q";

function removeIgnores(dir, meta) {
    var reader;
    var applyIgnores;
    var deferred = ext_q_Q.defer();
    var ignored = [];
    var nonIgnored = ['bower.json'];

    // Don't ignore main files
    nonIgnored = nonIgnored.concat(meta.main || []);

    nonIgnored = nonIgnored.map(function(file) {
        return ext_path_path.join(dir, file);
    });

    reader = ext_fstreamignore_fstreamIgnore({
        path: dir,
        type: 'Directory'
    });

    reader.addIgnoreRules(meta.ignore || []);

    // Monkey patch applyIgnores such that we get hold of all ignored files
    applyIgnores = reader.applyIgnores;
    reader.applyIgnores = function(entry) {
        var ret = applyIgnores.apply(this, arguments);

        if (!ret) {
            ignored.push(ext_path_path.join(dir, entry));
        }

        return ret;
    };

    reader
        .on('child', function(entry) {
            nonIgnored.push(entry.path);
        })
        .on('error', deferred.reject)
        .on('end', function() {
            var promises;

            // Ensure that we are not ignoring files that should not be ignored!
            ignored = ext_mout_mout.array.unique(ignored);
            ignored = ignored.filter(function(file) {
                return nonIgnored.indexOf(file) === -1;
            });

            // Delete all the ignored files
            promises = ignored.map(function(file) {
                return ext_q_Q.nfcall(utilrimraf_rimrafjsjs, file);
            });

            return ext_q_Q.all(promises).then(deferred.resolve, deferred.reject);
        });

    return deferred.promise;
}

export { removeIgnores_removeIgnores as removeIgnores };
