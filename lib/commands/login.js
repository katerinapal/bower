import ext_configstore_Configstore from "configstore";
import ext_github_GitHub from "github";
import ext_q_Q from "q";
import { createError as utilcreateError_createErrorjs } from "../util/createError";
import { defaultConfig as config_defaultConfigjs } from "../config";
import * as utilcli_readOptionsjs from "../util/cli";

function login(logger, options, config) {
    var configstore = new ext_configstore_Configstore('bower-github');

    config = config_defaultConfigjs(config);

    var promise;

    options = options || {};

    if (options.token) {
        promise = ext_q_Q.resolve({ token: options.token });
    } else {
        // This command requires interactive to be enabled
        if (!config.interactive) {
            logger.emit(
                'error',
                utilcreateError_createErrorjs('Login requires an interactive shell', 'ENOINT', {
                    details:
                        'Note that you can manually force an interactive shell with --config.interactive'
                })
            );

            return;
        }

        var questions = [
            {
                name: 'username',
                message: 'Username',
                type: 'input',
                default: configstore.get('username')
            },
            {
                name: 'password',
                message: 'Password',
                type: 'password'
            }
        ];

        var github = new ext_github_GitHub({
            version: '3.0.0'
        });

        promise = ext_q_Q.nfcall(logger.prompt.bind(logger), questions).then(function(
            answers
        ) {
            configstore.set('username', answers.username);

            github.authenticate({
                type: 'basic',
                username: answers.username,
                password: answers.password
            });

            return ext_q_Q.ninvoke(github.authorization, 'create', {
                scopes: ['user', 'repo'],
                note:
                    'Bower command line client (' +
                    new Date().toISOString() +
                    ')'
            });
        });
    }

    return promise.then(
        function(result) {
            configstore.set('accessToken', result.token);
            logger.info(
                'EAUTH',
                'Logged in as ' + configstore.get('username'),
                {}
            );

            return result;
        },
        function(error) {
            var message;

            try {
                message = JSON.parse(error.message).message;
            } catch (e) {
                message = 'Authorization failed';
            }

            var questions = [
                {
                    name: 'otpcode',
                    message: 'Two-Factor Auth Code',
                    type: 'input'
                }
            ];

            if (
                message === 'Must specify two-factor authentication OTP code.'
            ) {
                return ext_q_Q.nfcall(logger.prompt.bind(logger), questions)
                    .then(function(answers) {
                        return ext_q_Q.ninvoke(github.authorization, 'create', {
                            scopes: ['user', 'repo'],
                            note:
                                'Bower command line client (' +
                                new Date().toISOString() +
                                ')',
                            headers: {
                                'X-GitHub-OTP': answers.otpcode
                            }
                        });
                    })
                    .then(
                        function(result) {
                            configstore.set('accessToken', result.token);
                            logger.info(
                                'EAUTH',
                                'Logged in as ' + configstore.get('username'),
                                {}
                            );

                            return result;
                        },
                        function() {
                            logger.emit('error', utilcreateError_createErrorjs(message, 'EAUTH'));
                        }
                    );
            } else {
                logger.emit('error', utilcreateError_createErrorjs(message, 'EAUTH'));
            }
        }
    );
}

// -------------------

login.readOptions = function(argv) {
    var options = utilcli_readOptionsjs.readOptions(
        {
            token: { type: String, shorthand: 't' }
        },
        argv
    );

    delete options.argv;

    return [options];
};

var encapsulated_login;

encapsulated_login = login;
