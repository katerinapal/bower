var rootCheck_rootCheck = rootCheck;
import ext_isroot_isRoot from "is-root";
import { createError as createError_createErrorjs } from "./createError";
import * as cli_getRendererjs from "./cli";

var renderer;

function rootCheck(options, config) {
    var errorMsg;

    // Allow running the command as root
    if (options.allowRoot || config.allowRoot) {
        return;
    }

    errorMsg =
        'Since bower is a user command, there is no need to execute it with \
superuser permissions.\nIf you\'re having permission errors when using bower without \
sudo, please spend a few minutes learning more about how your system should work and \
make any necessary repairs.\n\n\
http://www.joyent.com/blog/installing-node-and-npm\n\
https://gist.github.com/isaacs/579814\n\n\
You can however run a command with sudo using "--allow-root" option';

    if (ext_isroot_isRoot()) {
        renderer = cli_getRendererjs.getRenderer('', false, config);
        renderer.error(
            createError_createErrorjs('Cannot be run with sudo', 'ESUDO', {
                details: errorMsg
            })
        );
        process.exit(1);
    }
}

export { rootCheck_rootCheck as rootCheck };
