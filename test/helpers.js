import ext_chalk_chalk from "chalk";
import ext_q_Q from "q";
import ext_path_path from "path";
import ext_mkdirp_mkdirp from "mkdirp";
import { rimrafjs as libutilrimraf_rimrafjsjs } from "../lib/util/rimraf";
import ext_nodeuuid_uuid from "node-uuid";
import ext_moutobject_object from "mout/object";
import { fs as libutilfs_fsjs } from "../lib/util/fs";
import ext_glob_glob from "glob";
import ext_os_os from "os";
import ext_which_which from "which";
import ext_proxyquire_proxyquire from "proxyquire";
import ext_spawnsync_spawnSync from "spawn-sync";
import { reset as configjs_reset } from "../lib/config";
import ext_nock_nock from "nock";
import ext_semver_semver from "semver";
ext_chalk_chalk.enabled = false;

var proxyquire = ext_proxyquire_proxyquire
    .noCallThru()
    .noPreserveCache();

// For better promise errors
ext_q_Q.longStackSupport = true;

// Those are needed for Travis or not configured git environment
var env = {
    GIT_AUTHOR_DATE: 'Sun Apr 7 22:13:13 2013 +0000',
    GIT_AUTHOR_NAME: 'André Cruz',
    GIT_AUTHOR_EMAIL: 'amdfcruz@gmail.com',
    GIT_COMMITTER_DATE: 'Sun Apr 7 22:13:13 2013 +0000',
    GIT_COMMITTER_NAME: 'André Cruz',
    GIT_COMMITTER_EMAIL: 'amdfcruz@gmail.com',
    NODE_ENV: 'test'
};

ext_moutobject_object.mixIn(process.env, env);

var tmpLocation = ext_path_path.join(
    ext_os_os.tmpdir ? ext_os_os.tmpdir() : ext_os_os.tmpDir(),
    'bower-tests',
    ext_nodeuuid_uuid.v4().slice(0, 8)
);

require_require = function(name, stubs) {
    if (stubs) {
        return proxyquire(ext_path_path.join(__dirname, '../', name), stubs);
    } else {
        return require(ext_path_path.join(__dirname, '../', name));
    }
};

// We need to reset cache because tests are reusing temp directories
beforeEach(function() {
    configjs_reset();
});

after(function() {
    libutilrimraf_rimrafjsjs.sync(tmpLocation);
});

TempDir_TempDir = (function() {
    function TempDir(defaults) {
        this.path = ext_path_path.join(tmpLocation, ext_nodeuuid_uuid.v4());
        this.defaults = defaults;
    }

    TempDir.prototype.create = function(files, defaults) {
        var that = this;

        defaults = defaults || this.defaults || {};
        files = ext_moutobject_object.merge(files || {}, defaults);

        this.meta = function(tag) {
            if (tag) {
                return files[tag]['bower.json'];
            } else {
                return files['bower.json'];
            }
        };

        if (files) {
            ext_moutobject_object.forOwn(files, function(contents, filepath) {
                if (typeof contents === 'object') {
                    contents = JSON.stringify(contents, null, ' ') + '\n';
                }

                var fullPath = ext_path_path.join(that.path, filepath);
                ext_mkdirp_mkdirp.sync(ext_path_path.dirname(fullPath));
                libutilfs_fsjs.writeFileSync(fullPath, contents);
            });
        }

        return this;
    };

    TempDir.prototype.prepare = function(files) {
        libutilrimraf_rimrafjsjs.sync(this.path);
        ext_mkdirp_mkdirp.sync(this.path);
        this.create(files);

        return this;
    };

    // TODO: Rewrite to synchronous form
    TempDir.prototype.prepareGit = function(revisions) {
        var that = this;

        revisions = ext_moutobject_object.merge(revisions || {}, this.defaults);

        libutilrimraf_rimrafjsjs.sync(that.path);

        ext_mkdirp_mkdirp.sync(that.path);

        this.git('init');

        this.glob('./!(.git)').map(function(removePath) {
            var fullPath = ext_path_path.join(that.path, removePath);

            libutilrimraf_rimrafjsjs.sync(fullPath);
        });

        ext_moutobject_object.forOwn(
            revisions,
            function(files, tag) {
                this.create(files, {});
                this.git('add', '-A');
                this.git('commit', '-m"commit"');
                this.git('tag', tag);
            }.bind(this)
        );

        return this;
    };

    TempDir.prototype.glob = function(pattern) {
        return ext_glob_glob.sync(pattern, {
            cwd: this.path,
            dot: true
        });
    };

    TempDir.prototype.getPath = function(name) {
        return ext_path_path.join(this.path, name);
    };

    TempDir.prototype.read = function(name) {
        return libutilfs_fsjs.readFileSync(this.getPath(name), 'utf8');
    };

    TempDir.prototype.readJson = function(name) {
        return JSON.parse(this.read(name));
    };

    TempDir.prototype.git = function() {
        var args = Array.prototype.slice.call(arguments);
        var result = ext_spawnsync_spawnSync('git', args, { cwd: this.path });

        if (result.status !== 0) {
            throw new Error(result.stderr);
        } else {
            return result.stdout.toString();
        }
    };

    TempDir.prototype.latestGitTag = function() {
        var versions = this.git('tag')
            .split(/\r?\n/)
            .map(function(t) {
                return t[0] == 'v' ? t.slice(1) : t;
            })
            .filter(ext_semver_semver.valid)
            .sort(ext_semver_semver.compare);

        if (versions.length >= 1) {
            return versions[versions.length - 1];
        } else {
            throw new Error('No valid git version tags found.');
        }
    };

    TempDir.prototype.exists = function(name) {
        return libutilfs_fsjs.existsSync(ext_path_path.join(this.path, name));
    };

    return TempDir;
})();

expectEvent_expectEvent = function expectEvent(emitter, eventName) {
    var deferred = ext_q_Q.defer();

    emitter.once(eventName, function() {
        deferred.resolve(arguments);
    });

    emitter.once('error', function(reason) {
        deferred.reject(reason);
    });

    return deferred.promise;
};

command_command = function(command, stubs) {
    var rawCommand;
    var commandStubs = {};

    stubs = stubs || {};
    var cwd = stubs.cwd;
    delete stubs.cwd;

    rawCommand = require_require('lib/commands/' + command, stubs);

    commandStubs['./' + command] = function() {
        var args = [].slice.call(arguments);
        args[rawCommand.length - 1] = ext_moutobject_object.merge(
            { cwd: cwd },
            args[rawCommand.length - 1] || {}
        );
        return rawCommand.apply(null, args);
    };

    var instance = require_require('lib/commands/index', commandStubs);

    var commandParts = command.split('/');

    while (commandParts.length > 0) {
        instance = instance[commandParts.shift()];
    }

    if (!instance) {
        throw new Error('Unknown command: ' + command);
    }

    // TODO: refactor tests, so they can use readOptions directly
    instance.readOptions = function(argv) {
        argv = ['node', 'bower'].concat(argv);
        argv = command.split('/').concat(argv);

        return rawCommand.readOptions(argv);
    };

    return instance;
};

run_run = function(command, args) {
    var logger = command.apply(null, args || []);

    // Hack so we can intercept prompring for data
    logger.prompt = function(data) {
        logger.emit('confirm', data);
    };

    var promise = expectEvent_expectEvent(logger, 'end');

    promise.logger = logger;

    return promise;
};

// Captures all stdout and stderr
capture_capture = function(callback) {
    var oldStdout = process.stdout.write;
    var oldStderr = process.stderr.write;

    var stdout = '';
    var stderr = '';

    process.stdout.write = function(text) {
        stdout += text;
    };

    process.stderr.write = function(text) {
        stderr += text;
    };

    return ext_q_Q.fcall(callback)
        .then(function() {
            process.stdout.write = oldStdout;
            process.stderr.write = oldStderr;

            return [stdout, stderr];
        })
        .fail(function(e) {
            process.stdout.write = oldStdout;
            process.stderr.write = oldStderr;

            throw e;
        });
};

hasSvn_hasSvn = function() {
    try {
        ext_which_which.sync('svn');
        return true;
    } catch (ex) {
        return false;
    }
};

isWin_isWin = function() {
    return process.platform === 'win32';
};

localSource_localSource = function(localPath) {
    localPath = ext_path_path.normalize(localPath);

    if (!isWin_isWin()) {
        localPath = 'file://' + localPath;
    }

    return localPath;
};

var localUrl;

// Used for example by "svn checkout" and "svn export"
localUrl = function(localPath) {
    localPath = ext_path_path.normalize(localPath);

    if (!isWin_isWin()) {
        localPath = 'file://' + localPath;
    } else {
        localPath = 'file:///' + localPath;
    }

    return localPath;
};

// Returns the result of executing the bower binary + args
// example: runBin('install') --> $ bower install
runBin_runBin = function(args) {
    args = args || [];
    args.unshift(ext_path_path.resolve(__dirname, '../bin/bower'));
    return ext_spawnsync_spawnSync('node', args);
};

afterEach(function() {
    ext_nock_nock.cleanAll();
});
var hasSvn_hasSvn;
export { hasSvn_hasSvn as hasSvn };
var command_command;
export { command_command as command };
var run_run;
export { run_run as run };
var TempDir_TempDir;
export { TempDir_TempDir as TempDir };
var expectEvent_expectEvent;
export { expectEvent_expectEvent as expectEvent };
var runBin_runBin;
export { runBin_runBin as runBin };
var require_require;
export { require_require as require };
var localSource_localSource;
export { localSource_localSource as localSource };
var capture_capture;
export { capture_capture as capture };
var isWin_isWin;
export { isWin_isWin as isWin };
