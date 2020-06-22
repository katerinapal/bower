import ext_chalk_chalk from "chalk";
import ext_q_Q from "q";
import { defaultConfig as config_defaultConfigjs } from "../config";
import { PackageRepository as corePackageRepository_PackageRepositoryjs } from "../core/PackageRepository";
import { createError as utilcreateError_createErrorjs } from "../util/createError";
import * as utilcli_readOptionsjs from "../util/cli";

function unregister(logger, name, config) {
    if (!name) {
        return;
    }

    var repository;
    var registryClient;
    var force;

    config = config_defaultConfigjs(config);
    force = config.force;

    // Bypass any cache
    config.offline = false;
    config.force = true;

    // Trim name
    name = name.trim();

    repository = new corePackageRepository_PackageRepositoryjs(config, logger);

    if (!config.accessToken) {
        return logger.emit(
            'error',
            utilcreateError_createErrorjs(
                'Use "bower login" with collaborator credentials',
                'EFORBIDDEN'
            )
        );
    }

    return ext_q_Q.resolve()
        .then(function() {
            // If non interactive or user forced, bypass confirmation
            if (!config.interactive || force) {
                return true;
            }

            return ext_q_Q.nfcall(logger.prompt.bind(logger), {
                type: 'confirm',
                message:
                    'You are about to remove component "' +
                    ext_chalk_chalk.cyan.underline(name) +
                    '" from the bower registry (' +
                    ext_chalk_chalk.cyan.underline(config.registry.register) +
                    '). It is generally considered bad behavior to remove versions of a library that others are depending on. Are you really sure?',
                default: false
            });
        })
        .then(function(result) {
            // If user response was negative, abort
            if (!result) {
                return;
            }

            registryClient = repository.getRegistryClient();

            logger.action('unregister', name, { name: name });

            return ext_q_Q.nfcall(
                registryClient.unregister.bind(registryClient),
                name
            );
        })
        .then(function(result) {
            logger.info('Package unregistered', name);

            return result;
        });
}

// -------------------

unregister.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var name = options.argv.remain[1];

    return [name];
};

var encapsulated_unregister;

encapsulated_unregister = unregister;
