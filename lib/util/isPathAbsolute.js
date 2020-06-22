var isPathAbsolute_isPathAbsolute = isPathAbsolute;
function isPathAbsolute(filePath) {
    return filePath.charAt(0) === '/';
}

export { isPathAbsolute_isPathAbsolute as isPathAbsolute };
