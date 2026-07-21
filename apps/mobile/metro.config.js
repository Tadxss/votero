const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// pnpm workspaces hoist via symlinks rather than flat node_modules, which Metro's default
// resolver doesn't handle on its own — watch the monorepo root and let Metro follow symlinks
// so `@repo/shared`/`@repo/types` resolve to their real (non-hoisted) location.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./src/global.css" });
