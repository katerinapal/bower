import ext_mout_mout from "mout";
import { cmd as utilcmd_cmdjs } from "../util/cmd";
import ext_q_Q from "q";
import ext_shellquote_shellquote from "shell-quote";

var orderByDependencies = function(packages, installed, json) {
    var ordered = [];
    installed = ext_mout_mout.object.keys(installed);

    var depsSatisfied = function(packageName) {
        return ext_mout_mout.array.difference(
            ext_mout_mout.object.keys(packages[packageName].dependencies),
            installed,
            ordered
        ).length === 0;
    };

    var depsFromBowerJson =
        json && json.dependencies ? ext_mout_mout.object.keys(json.dependencies) : [];
    var packageNames = ext_mout_mout.object.keys(packages);

    //get the list of the packages that are specified in bower.json in that order
    //its nice to maintain that order for users
    var desiredOrder = ext_mout_mout.array.intersection(depsFromBowerJson, packageNames);
    //then add to the end any remaining packages that werent in bower.json
    desiredOrder = desiredOrder.concat(
        ext_mout_mout.array.difference(packageNames, desiredOrder)
    );

    //the desired order isn't necessarily a correct dependency specific order
    //so we ensure that below
    var resolvedOne = true;
    while (resolvedOne) {
        resolvedOne = false;

        for (var i = 0; i < desiredOrder.length; i++) {
            var packageName = desiredOrder[i];
            if (depsSatisfied(packageName)) {
                ordered.push(packageName);
                ext_mout_mout.array.remove(desiredOrder, packageName);
                //as soon as we resolve a package start the loop again
                resolvedOne = true;
                break;
            }
        }

        if (!resolvedOne && desiredOrder.length > 0) {
            //if we're here then some package(s) doesn't have all its deps satisified
            //so lets just jam those names on the end
            ordered = ordered.concat(desiredOrder);
        }
    }

    return ordered;
};

var run = function(cmdString, action, logger, config) {
    logger.action(action, cmdString);

    //pass env + BOWER_PID so callees can identify a preinstall+postinstall from the same bower instance
    var env = ext_mout_mout.object.mixIn({ BOWER_PID: process.pid }, process.env);
    var args = ext_shellquote_shellquote.parse(cmdString, env);
    var cmdName = args[0];
    ext_mout_mout.array.remove(args, cmdName); //no rest() in mout

    var options = {
        cwd: config.cwd,
        env: env
    };

    var promise = utilcmd_cmdjs(cmdName, args, options);

    promise.progress(function(progress) {
        progress.split('\n').forEach(function(line) {
            if (line) {
                logger.action(action, line);
            }
        });
    });

    return promise;
};

var hook = function(
    action,
    ordered,
    config,
    logger,
    packages,
    installed,
    json
) {
    if (
        ext_mout_mout.object.keys(packages).length === 0 ||
        !config.scripts ||
        !config.scripts[action]
    ) {
        return ext_q_Q();
    }

    var orderedPackages = ordered
        ? orderByDependencies(packages, installed, json)
        : ext_mout_mout.object.keys(packages);
    var placeholder = new RegExp('%', 'g');
    var cmdString = ext_mout_mout.string.replace(
        config.scripts[action],
        placeholder,
        orderedPackages.join(' ')
    );
    return run(cmdString, action, logger, config);
};

module.exports = {
    preuninstall: ext_mout_mout.function.partial(hook, 'preuninstall', false),
    postuninstall: ext_mout_mout.function.partial(hook, 'postuninstall', false),
    preinstall: ext_mout_mout.function.partial(hook, 'preinstall', true),
    postinstall: ext_mout_mout.function.partial(hook, 'postinstall', true),
    //only exposed for test
    _orderByDependencies: orderByDependencies
};
export { scriptsjs_scriptsjs as scriptsjs };
