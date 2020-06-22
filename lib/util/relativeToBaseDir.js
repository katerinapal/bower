var relativeToBaseDir_relativeToBaseDir = relativeToBaseDir;
import ext_path_path from "path";
import { isPathAbsolute as isPathAbsolute_isPathAbsolutejs } from "./isPathAbsolute";

function relativeToBaseDir(baseDir) {
    return function(filePath) {
        if (isPathAbsolute_isPathAbsolutejs(filePath)) {
            return ext_path_path.resolve(filePath);
        } else {
            return ext_path_path.resolve(baseDir, filePath);
        }
    };
}

export { relativeToBaseDir_relativeToBaseDir as relativeToBaseDir };
