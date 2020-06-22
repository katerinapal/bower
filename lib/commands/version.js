import ext_semver_semver from "semver";
import ext_which_which from "which";
import { fs as utilfs_fsjs } from "../util/fs";
import ext_path_path from "path";
import ext_q_Q from "q";
import ext_child_process_child_process from "child_process";
import { defaultConfig as config_defaultConfigjs } from "../config";
import { createError as utilcreateError_createErrorjs } from "../util/createError";
import * as utilcli_readOptionsjs from "../util/cli";
var execFile = ext_child_process_child_process.execFile;

function version(logger, versionArg, options, config) {
    options = options || {};

    config = config_defaultConfigjs(config);

    return bump(logger, config, versionArg, options.message);
}

function bump(logger, config, versionArg, message) {
    var cwd = config.cwd || process.cwd();
    var newVersion;

    if (!versionArg) {
        throw utilcreateError_createErrorjs('No <version> agrument provided', 'EREADOPTIONS');
    }

    return driver
        .check(cwd)
        .then(function() {
            return ext_q_Q.all([driver.versions(cwd), driver.currentVersion(cwd)]);
        })
        .spread(function(versions, currentVersion) {
            currentVersion = currentVersion || '0.0.0';

            if (ext_semver_semver.valid(versionArg)) {
                newVersion = ext_semver_semver.valid(versionArg);
            } else {
                newVersion = ext_semver_semver.inc(currentVersion, versionArg);

                if (!newVersion) {
                    throw utilcreateError_createErrorjs(
                        'Invalid <version> argument: ' + versionArg,
                        'EINVALIDVERSION',
                        { version: versionArg }
                    );
                }
            }

            newVersion =
                currentVersion[0] === 'v' ? 'v' + newVersion : newVersion;

            if (versions) {
                versions.forEach(function(version) {
                    if (ext_semver_semver.eq(version, newVersion)) {
                        throw utilcreateError_createErrorjs(
                            'Version exists: ' + newVersion,
                            'EVERSIONEXISTS',
                            { versions: versions, newVersion: newVersion }
                        );
                    }
                });
            }

            return driver.bump(cwd, newVersion, message).then(function() {
                return {
                    oldVersion: currentVersion,
                    newVersion: newVersion
                };
            });
        })
        .then(function(result) {
            logger.info(
                'version',
                'Bumped package version from ' +
                    result.oldVersion +
                    ' to ' +
                    result.newVersion,
                result
            );

            return result.newVersion;
        });
}

var driver = {
    check: function(cwd) {
        function checkGit(cwd) {
            var gitDir = ext_path_path.join(cwd, '.git');
            return ext_q_Q.nfcall(utilfs_fsjs.stat, gitDir).then(
                function(stat) {
                    if (stat.isDirectory()) {
                        return checkGitStatus(cwd);
                    }
                    return false;
                },
                function() {
                    //Ignore not found .git directory
                    return false;
                }
            );
        }

        function checkGitStatus(cwd) {
            return ext_q_Q.nfcall(ext_which_which, 'git')
                .fail(function(err) {
                    err.code = 'ENOGIT';
                    throw err;
                })
                .then(function() {
                    return ext_q_Q.nfcall(
                        execFile,
                        'git',
                        ['status', '--porcelain'],
                        { env: process.env, cwd: cwd }
                    );
                })
                .then(function(value) {
                    var stdout = value[0];
                    var lines = filterModifiedStatusLines(stdout);
                    if (lines.length) {
                        throw utilcreateError_createErrorjs(
                            'Version bump requires clean working directory',
                            'EWORKINGDIRECTORYDIRTY'
                        );
                    }
                    return true;
                });
        }

        function filterModifiedStatusLines(stdout) {
            return stdout
                .trim()
                .split('\n')
                .filter(function(line) {
                    return line.trim() && !line.match(/^\?\? /);
                })
                .map(function(line) {
                    return line.trim();
                });
        }

        return checkGit(cwd).then(function(hasGit) {
            if (!hasGit) {
                throw utilcreateError_createErrorjs(
                    'Version bump currently supports only git repositories',
                    'ENOTGITREPOSITORY'
                );
            }
        });
    },
    versions: function(cwd) {
        return ext_q_Q.nfcall(execFile, 'git', ['tag'], {
            env: process.env,
            cwd: cwd
        }).then(
            function(res) {
                var versions = res[0].split(/\r?\n/).filter(ext_semver_semver.valid);

                return versions;
            },
            function() {
                return [];
            }
        );
    },
    currentVersion: function(cwd) {
        return ext_q_Q.nfcall(execFile, 'git', ['describe', '--abbrev=0', '--tags'], {
            env: process.env,
            cwd: cwd
        }).then(
            function(res) {
                var version = res[0].split(/\r?\n/).filter(ext_semver_semver.valid)[0];

                return version;
            },
            function() {
                return undefined;
            }
        );
    },
    bump: function(cwd, tag, message) {
        message = message || tag;
        message = message.replace(/%s/g, tag);
        return ext_q_Q.nfcall(
            execFile,
            'git',
            ['commit', '-m', message, '--allow-empty'],
            { env: process.env, cwd: cwd }
        ).then(function() {
            return ext_q_Q.nfcall(execFile, 'git', ['tag', tag, '-am', message], {
                env: process.env,
                cwd: cwd
            });
        });
    }
};

version.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(
        {
            message: { type: String, shorthand: 'm' }
        },
        argv
    );

    return [options.argv.remain[1], options];
};

var encapsulated_version;

encapsulated_version = version;
