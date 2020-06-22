var cmd_cmd = cmd;
import ext_child_process_cp from "child_process";
import ext_path_path from "path";
import ext_q_Q from "q";
import ext_mout_mout from "mout";
import ext_which_which from "which";
import ext_pthrottler_PThrottler from "p-throttler";
import { createError as createError_createErrorjs } from "./createError";

// The concurrency limit here is kind of magic. You don't really gain a lot from
// having a large number of commands spawned at once, so it isn't super
// important for this number to be large. Reports have shown that much more than 5
// or 10 cause issues for corporate networks, private repos or situations where
// internet bandwidth is limited. We're running with a concurrency of 5 until
// 1.4.X is released, at which time we'll move to what was discussed in #1262
// https://github.com/bower/bower/pull/1262
var throttler = new ext_pthrottler_PThrottler(5);

var winBatchExtensions;
var winWhichCache;
var isWin = process.platform === 'win32';

if (isWin) {
    winBatchExtensions = ['.bat', '.cmd'];
    winWhichCache = {};
}

function getWindowsCommand(command) {
    var fullCommand;
    var extension;

    // Do we got the value converted in the cache?
    if (ext_mout_mout.object.hasOwn(winWhichCache, command)) {
        return winWhichCache[command];
    }

    // Use which to retrieve the full command, which puts the extension in the end
    try {
        fullCommand = ext_which_which.sync(command);
    } catch (err) {
        return (winWhichCache[command] = command);
    }

    extension = ext_path_path.extname(fullCommand).toLowerCase();

    // Does it need to be converted?
    if (winBatchExtensions.indexOf(extension) === -1) {
        return (winWhichCache[command] = command);
    }

    return (winWhichCache[command] = fullCommand);
}

// Executes a shell command, buffering the stdout and stderr
// If an error occurs, a meaningful error is generated
// Returns a promise that gets fulfilled if the command succeeds
// or rejected if it fails
function executeCmd(command, args, options) {
    var process;
    var stderr = '';
    var stdout = '';
    var deferred = ext_q_Q.defer();

    // Windows workaround for .bat and .cmd files, see #626
    if (isWin) {
        command = getWindowsCommand(command);
    }

    // Buffer output, reporting progress
    process = ext_child_process_cp.spawn(command, args, options);
    process.stdout.on('data', function(data) {
        data = data.toString();
        deferred.notify(data);
        stdout += data;
    });
    process.stderr.on('data', function(data) {
        data = data.toString();
        deferred.notify(data);
        stderr += data;
    });

    // If there is an error spawning the command, reject the promise
    process.on('error', function(error) {
        return deferred.reject(error);
    });

    // Listen to the close event instead of exit
    // They are similar but close ensures that streams are flushed
    process.on('close', function(code) {
        var fullCommand;
        var error;

        if (code) {
            // Generate the full command to be presented in the error message
            if (!Array.isArray(args)) {
                args = [];
            }

            fullCommand = command;
            fullCommand += args.length ? ' ' + args.join(' ') : '';

            // Build the error instance
            error = createError_createErrorjs(
                'Failed to execute "' +
                    fullCommand +
                    '", exit code of #' +
                    code +
                    '\n' +
                    stderr,
                'ECMDERR',
                {
                    details: stderr,
                    exitCode: code
                }
            );

            return deferred.reject(error);
        }

        return deferred.resolve([stdout, stderr]);
    });

    return deferred.promise;
}

function cmd(command, args, options) {
    return throttler.enqueue(executeCmd.bind(null, command, args, options));
}

export { cmd_cmd as cmd };
