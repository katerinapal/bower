import ext_q_Q from "q";
import ext_mout_mout from "mout";
import ext_bowerlogger_Logger from "bower-logger";
import ext_userhome_userHome from "user-home";
import { indexjs as index_indexjsjs } from "../";
import { versionjs as version_versionjsjs } from "../version";
import * as utilcli_clijsjs from "../util/cli";
import { rootCheck as utilrootCheck_rootCheckjs } from "../util/rootCheck";
import ext_updatenotifier_updateNotifier from "update-notifier";
process.bin = process.title = 'bower';

var options;
var renderer;
var loglevel;
var command;
var commandFunc;
var logger;
var levels = ext_bowerlogger_Logger.LEVELS;

options = utilcli_clijsjs.readOptions({
    version: { type: Boolean, shorthand: 'v' },
    help: { type: Boolean, shorthand: 'h' },
    'allow-root': { type: Boolean }
});

// Handle print of version
if (options.version) {
    process.stdout.write(version_versionjsjs + '\n');
    process.exit();
}

// Root check
utilrootCheck_rootCheckjs(options, index_indexjsjs.config);

// Set loglevel
if (index_indexjsjs.config.silent) {
    loglevel = levels.error;
} else if (index_indexjsjs.config.verbose) {
    loglevel = -Infinity;
    ext_q_Q.longStackSupport = true;
} else if (index_indexjsjs.config.quiet) {
    loglevel = levels.warn;
} else {
    loglevel = levels[index_indexjsjs.config.loglevel] || levels.info;
}

// Get the command to execute
while (options.argv.remain.length) {
    command = options.argv.remain.join(' ');

    // Alias lookup
    if (index_indexjsjs.abbreviations[command]) {
        command = index_indexjsjs.abbreviations[command].replace(/\s/g, '.');
        break;
    }

    command = command.replace(/\s/g, '.');

    // Direct lookup
    if (ext_mout_mout.object.has(index_indexjsjs.commands, command)) {
        break;
    }

    options.argv.remain.pop();
}

// Execute the command
commandFunc = command && ext_mout_mout.object.get(index_indexjsjs.commands, command);
command = command && command.replace(/\./g, ' ');

// If no command was specified, show bower help
// Do the same if the command is unknown
if (!commandFunc) {
    logger = index_indexjsjs.commands.help();
    command = 'help';
    // If the user requested help, show the command's help
    // Do the same if the actual command is a group of other commands (e.g.: cache)
} else if (options.help || !commandFunc.line) {
    logger = index_indexjsjs.commands.help(command);
    command = 'help';
    // Call the line method
} else {
    logger = commandFunc.line(process.argv);

    // If the method failed to interpret the process arguments
    // show the command help
    if (!logger) {
        logger = index_indexjsjs.commands.help(command);
        command = 'help';
    }
}

// Get the renderer and configure it with the executed command
renderer = utilcli_clijsjs.getRenderer(command, logger.json, index_indexjsjs.config);

function handleLogger(logger, renderer) {
    logger
        .on('end', function(data) {
            if (!index_indexjsjs.config.silent && !index_indexjsjs.config.quiet) {
                renderer.end(data);
            }
        })
        .on('error', function(err) {
            if (
                command !== 'help' &&
                (err.code === 'EREADOPTIONS' || err.code === 'EINVFORMAT')
            ) {
                logger = index_indexjsjs.commands.help(command);
                renderer = utilcli_clijsjs.getRenderer('help', logger.json, index_indexjsjs.config);
                handleLogger(logger, renderer);
            } else {
                if (levels.error >= loglevel) {
                    renderer.error(err);
                }

                process.exit(1);
            }
        })
        .on('log', function(log) {
            if (levels[log.level] >= loglevel) {
                renderer.log(log);
            }
        })
        .on('prompt', function(prompt, callback) {
            renderer.prompt(prompt).then(function(answer) {
                callback(answer);
            });
        });
}

handleLogger(logger, renderer);

// Warn if HOME is not SET
if (!ext_userhome_userHome) {
    logger.warn(
        'no-home',
        'HOME environment variable not set. User config will not be loaded.'
    );
}

if (index_indexjsjs.config.interactive) {
    // Check for newer version of Bower
    var notifier = ext_updatenotifier_updateNotifier({ pkg: { name: 'bower', version: version_versionjsjs } });

    if (notifier.update && levels.info >= loglevel) {
        notifier.notify();
    }
}
