import ext_mout_mout from "mout";
import ext_q_Q from "q";
import ext_bowerendpointparser_endpointParser from "bower-endpoint-parser";
import { PackageRepository as corePackageRepository_PackageRepositoryjs } from "../core/PackageRepository";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function info(logger, endpoint, property, config) {
    if (!endpoint) {
        return;
    }

    // handle @ as version divider
    var splitParts = endpoint.split('/');
    splitParts[splitParts.length - 1] = splitParts[
        splitParts.length - 1
    ].replace('@', '#');
    endpoint = splitParts.join('/');

    var repository;
    var decEndpoint;

    config = config_defaultConfigjs(config);
    repository = new corePackageRepository_PackageRepositoryjs(config, logger);

    decEndpoint = ext_bowerendpointparser_endpointParser.decompose(endpoint);

    return ext_q_Q.all([
        getPkgMeta(repository, decEndpoint, property),
        decEndpoint.target === '*' && !property
            ? repository.versions(decEndpoint.source)
            : null
    ]).spread(function(pkgMeta, versions) {
        if (versions) {
            return {
                name: decEndpoint.source,
                versions: versions,
                latest: pkgMeta
            };
        }

        return pkgMeta;
    });
}

function getPkgMeta(repository, decEndpoint, property) {
    return repository
        .fetch(decEndpoint)
        .spread(function(canonicalDir, pkgMeta) {
            pkgMeta = ext_mout_mout.object.filter(pkgMeta, function(value, key) {
                return key.charAt(0) !== '_';
            });

            // Retrieve specific property
            if (property) {
                pkgMeta = ext_mout_mout.object.get(pkgMeta, property);
            }

            return pkgMeta;
        });
}

// -------------------

info.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var pkg = options.argv.remain[1];
    var property = options.argv.remain[2];

    return [pkg, property];
};

var encapsulated_info;

encapsulated_info = info;
