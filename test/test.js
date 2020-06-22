import * as helpers_hasSvnjs from "./helpers";
import "../lib/core/resolvers/Resolver";
import "./core/resolvers/resolver";
import "./core/resolvers/urlResolver";
import "./core/resolvers/fsResolver";
import "./core/resolvers/gitResolver";
import "./core/resolvers/gitFsResolver";
import "./core/resolvers/gitRemoteResolver";
import "./core/resolvers/gitHubResolver";
import "./core/resolvers/svnResolver";
import "./core/resolverFactory";
import "./core/resolveCache";
import "./core/packageRepository";
import "./core/scripts";
import "./core/Manager";
import "./renderers/StandardRenderer.js";
import "./renderers/JsonRenderer.js";
import "./commands/index.js";
import "./util/index.js";

if (!helpers_hasSvnjs.hasSvn()) {
    console.warn('#######################################################');
    console.warn('It is recommended you install svn for complete testing!');
    console.warn('#######################################################');
}

process.removeAllListeners('uncaughtException');
