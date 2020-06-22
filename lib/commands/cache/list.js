import ext_mout_mout from "mout";
import { PackageRepository as corePackageRepository_PackageRepositoryjs } from "../../core/PackageRepository";
import { defaultConfig as config_defaultConfigjs } from "../../config";
import * as utilcli_readOptionsjs from "../../util/cli";

function list(logger, packages, options, config) {
    var repository;

    config = config_defaultConfigjs(config);
    repository = new corePackageRepository_PackageRepositoryjs(config, logger);

    // If packages is an empty array, null them
    if (packages && !packages.length) {
        packages = null;
    }

    return repository.list().then(function(entries) {
        if (packages) {
            // Filter entries according to the specified packages
            entries = entries.filter(function(entry) {
                return !!ext_mout_mout.array.find(packages, function(pkg) {
                    return pkg === entry.pkgMeta.name;
                });
            });
        }

        return entries;
    });
}

// -------------------

list.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var packages = options.argv.remain.slice(2);

    delete options.argv;

    return [packages, options];
};

var encapsulated_list;

encapsulated_list = list;
