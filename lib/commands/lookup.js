import ext_q_Q from "q";
import { PackageRepository as corePackageRepository_PackageRepositoryjs } from "../core/PackageRepository";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function lookup(logger, name, config) {
    if (!name) {
        return new ext_q_Q(null);
    }

    config = config_defaultConfigjs(config);

    var repository = new corePackageRepository_PackageRepositoryjs(config, logger);
    var registryClient = repository.getRegistryClient();

    return ext_q_Q.nfcall(registryClient.lookup.bind(registryClient), name).then(
        function(entry) {
            return !entry
                ? null
                : {
                    name: name,
                    url: entry.url
                };
        }
    );
}

// -------------------

lookup.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var name = options.argv.remain[1];

    return [name];
};

var encapsulated_lookup;

encapsulated_lookup = lookup;
