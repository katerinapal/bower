var download_download = download;
import ext_requestprogress_progress from "request-progress";
import ext_request_request from "request";
import ext_q_Q from "q";
import ext_mout_mout from "mout";
import ext_retry_retry from "retry";
import { createError as createError_createErrorjs } from "./createError";
import ext_fswritestreamatomic_createWriteStream from "fs-write-stream-atomic";
import ext_destroy_destroy from "destroy";

var errorCodes = [
    'EADDRINFO',
    'ETIMEDOUT',
    'ECONNRESET',
    'ESOCKETTIMEDOUT',
    'ENOTFOUND'
];

function download(url, file, options) {
    var operation;
    var deferred = ext_q_Q.defer();
    var progressDelay = 8000;

    options = ext_mout_mout.object.mixIn(
        {
            retries: 5,
            factor: 2,
            minTimeout: 1000,
            maxTimeout: 35000,
            randomize: true,
            progressDelay: progressDelay,
            gzip: true
        },
        options || {}
    );

    // Retry on network errors
    operation = ext_retry_retry.operation(options);

    operation.attempt(function() {
        ext_q_Q.fcall(fetch, url, file, options)
            .then(function(response) {
                deferred.resolve(response);
            })
            .progress(function(status) {
                deferred.notify(status);
            })
            .fail(function(error) {
                // Save timeout before retrying to report
                var timeout = operation._timeouts[0];

                // Reject if error is not a network error
                if (errorCodes.indexOf(error.code) === -1) {
                    return deferred.reject(error);
                }

                // Next attempt will start reporting download progress immediately
                progressDelay = 0;

                // This will schedule next retry or return false
                if (operation.retry(error)) {
                    deferred.notify({
                        retry: true,
                        delay: timeout,
                        error: error
                    });
                } else {
                    deferred.reject(error);
                }
            });
    });

    return deferred.promise;
}

function fetch(url, file, options) {
    var deferred = ext_q_Q.defer();

    var contentLength;
    var bytesDownloaded = 0;

    var reject = function(error) {
        deferred.reject(error);
    };

    var req = ext_requestprogress_progress(ext_request_request(url, options), {
        delay: options.progressDelay
    })
        .on('response', function(response) {
            contentLength = Number(response.headers['content-length']);

            var status = response.statusCode;

            if (status < 200 || status >= 300) {
                return deferred.reject(
                    createError_createErrorjs('Status code of ' + status, 'EHTTP')
                );
            }

            var writeStream = ext_fswritestreamatomic_createWriteStream(file);
            var errored = false;

            // Change error listener so it cleans up writeStream before exiting
            req.removeListener('error', reject);
            req.on('error', function(error) {
                errored = true;
                ext_destroy_destroy(req);
                ext_destroy_destroy(writeStream);

                // Wait for writeStream to cleanup after itself...
                // TODO: Maybe there's a better way?
                setTimeout(function() {
                    deferred.reject(error);
                }, 50);
            });

            writeStream.on('finish', function() {
                if (!errored) {
                    ext_destroy_destroy(req);
                    deferred.resolve(response);
                }
            });

            req.pipe(writeStream);
        })
        .on('data', function(data) {
            bytesDownloaded += data.length;
        })
        .on('progress', function(state) {
            deferred.notify(state);
        })
        .on('error', reject)
        .on('end', function() {
            // Check if the whole file was downloaded
            // In some unstable connections the ACK/FIN packet might be sent in the
            // middle of the download
            // See: https://github.com/joyent/node/issues/6143
            if (contentLength && bytesDownloaded < contentLength) {
                req.emit(
                    'error',
                    createError_createErrorjs(
                        'Transfer closed with ' +
                            (contentLength - bytesDownloaded) +
                            ' bytes remaining to read',
                        'EINCOMPLETE'
                    )
                );
            }
        });

    return deferred.promise;
}

export { download_download as download };
