import { indexjs as index_indexjsjs } from "./commands";
import { versionjs as version_versionjsjs } from "./version";
import { abbreviationsjs as utilabbreviations_abbreviationsjs } from "./util/abbreviations";
import { clearRuntimeCache as PackageRepositoryjs_clearRuntimeCache } from "./core/PackageRepository";
import { defaultConfig as config_defaultConfig } from "./config";
var abbreviations = utilabbreviations_abbreviationsjs(index_indexjsjs);

function clearRuntimeCache() {
    PackageRepositoryjs_clearRuntimeCache();
}

module.exports = {
    version: version_versionjsjs,
    commands: index_indexjsjs,
    config: config_defaultConfig(),
    abbreviations: abbreviations,
    reset: clearRuntimeCache
};
export { indexjs_indexjs as indexjs };
