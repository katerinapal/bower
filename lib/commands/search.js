import ext_q_Q from "q";
import { PackageRepository as corePackageRepository_PackageRepositoryjs } from "../core/PackageRepository";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";
import { createError as utilcreateError_createErrorjs } from "../util/createError";

function search(logger, name, config) {
    var registryClient;

    config = config_defaultConfigjs(config);

    var repository = new corePackageRepository_PackageRepositoryjs(config, logger);
    var registryClient = repository.getRegistryClient();

    if (name) {
        return ext_q_Q.nfcall(registryClient.search.bind(registryClient), name);
    } else {
        // List all packages when in interactive mode + json enabled, and
        // always when in non-interactive mode
        if (config.interactive && !config.json) {
            throw utilcreateError_createErrorjs('no parameter to bower search', 'EREADOPTIONS');
        }

        return ext_q_Q.nfcall(registryClient.list.bind(registryClient));
    }
}

// -------------------

search.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var terms = options.argv.remain.slice(1);

    var name = terms.join(' ');

    return [name];
};

var encapsulated_search;

encapsulated_search = search;
