import ext_q_Q from "q";
import ext_chalk_chalk from "chalk";
import { PackageRepository as corePackageRepository_PackageRepositoryjs } from "../core/PackageRepository";
import { createError as utilcreateError_createErrorjs } from "../util/createError";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function register(logger, name, source, config) {
    var repository;
    var registryClient;
    var force;
    var url;
    var githubSourceRegex = /^\w[\w-]*\/\w[\w-]*$/;
    var getGithubUrl = function(source) {
        return 'git@github.com:' + source + '.git';
    };

    config = config_defaultConfigjs(config);
    force = config.force;

    name = (name || '').trim();
    source = (source || '').trim();

    url = source.match(githubSourceRegex) ? getGithubUrl(source) : source;

    // Bypass any cache
    config.offline = false;
    config.force = true;

    return ext_q_Q.try(function() {
        // Verify name and url
        if (!name || !url) {
            throw utilcreateError_createErrorjs(
                'Usage: bower register <name> <url>',
                'EINVFORMAT'
            );
        }

        // Attempt to resolve the package referenced by the URL to ensure
        // everything is ok before registering
        repository = new corePackageRepository_PackageRepositoryjs(config, logger);
        return repository.fetch({ name: name, source: url, target: '*' });
    })
        .spread(function(canonicalDir, pkgMeta) {
            if (pkgMeta.private) {
                throw utilcreateError_createErrorjs(
                    'The package you are trying to register is marked as private',
                    'EPRIV'
                );
            }

            // If non interactive or user forced, bypass confirmation
            if (!config.interactive || force) {
                return true;
            }

            // Confirm if the user really wants to register
            return ext_q_Q.nfcall(logger.prompt.bind(logger), {
                type: 'confirm',
                message:
                    'Registering a package will make it installable via the registry (' +
                    ext_chalk_chalk.cyan.underline(config.registry.register) +
                    '), continue?',
                default: true
            });
        })
        .then(function(result) {
            // If user response was negative, abort
            if (!result) {
                return;
            }

            // Register
            registryClient = repository.getRegistryClient();

            logger.action('register', url, {
                name: name,
                url: url
            });

            return ext_q_Q.nfcall(
                registryClient.register.bind(registryClient),
                name,
                url
            );
        });
}

// -------------------

register.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(argv);
    var name = options.argv.remain[1];
    var url = options.argv.remain[2];

    return [name, url];
};

var encapsulated_register;

encapsulated_register = register;
