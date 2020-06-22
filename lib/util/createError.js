var createError_createError = createError;
import ext_mout_mout from "mout";

function createError(msg, code, props) {
    var err = new Error(msg);
    err.code = code;

    if (props) {
        ext_mout_mout.object.mixIn(err, props);
    }

    return err;
}

export { createError_createError as createError };
