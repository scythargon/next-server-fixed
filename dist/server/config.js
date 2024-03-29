"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const find_up_1 = __importDefault(require("find-up"));
const constants_1 = require("../lib/constants");
const targets = ['server', 'serverless'];
const defaultConfig = {
    env: [],
    webpack: null,
    webpackDevMiddleware: null,
    distDir: '.next',
    assetPrefix: '',
    configOrigin: 'default',
    useFileSystemPublicRoutes: true,
    generateBuildId: () => null,
    generateEtags: true,
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
    target: process.env.__NEXT_BUILDER_EXPERIMENTAL_TARGET || 'server',
    poweredByHeader: true,
    onDemandEntries: {
        maxInactiveAge: 60 * 1000,
        pagesBufferLength: 2,
    },
    amp: {
        canonicalBase: '',
    },
    experimental: {
        cpus: Math.max(1, (Number(process.env.CIRCLE_NODE_TOTAL) ||
            (os_1.default.cpus() || { length: 1 }).length) - 1),
        ampBindInitData: false,
        exportTrailingSlash: false,
        terserLoader: false,
        profiling: false,
        flyingShuttle: false,
        asyncToPromises: false,
        documentMiddleware: false,
    },
};
function assignDefaults(userConfig) {
    Object.keys(userConfig).forEach((key) => {
        const maybeObject = userConfig[key];
        if (!!maybeObject && maybeObject.constructor === Object) {
            userConfig[key] = Object.assign({}, (defaultConfig[key] || {}), userConfig[key]);
        }
    });
    return Object.assign({}, defaultConfig, userConfig);
}
function normalizeConfig(phase, config) {
    if (typeof config === 'function') {
        config = config(phase, { defaultConfig });
        if (typeof config.then === 'function') {
            throw new Error('> Promise returned in next config. https://err.sh/zeit/next.js/promise-in-next-config.md');
        }
    }
    return config;
}
function loadConfig(phase, dir, customConfig) {
    if (customConfig) {
        return assignDefaults(Object.assign({ configOrigin: 'server' }, customConfig));
    }
    const path = find_up_1.default.sync(constants_1.CONFIG_FILE, {
        cwd: dir,
    });
    // If config file was found
    if (path && path.length) {
        const userConfigModule = require(path);
        const userConfig = normalizeConfig(phase, userConfigModule.default || userConfigModule);
        if (userConfig.target && !targets.includes(userConfig.target)) {
            throw new Error(`Specified target is invalid. Provided: "${userConfig.target}" should be one of ${targets.join(', ')}`);
        }
        if (userConfig.amp && userConfig.amp.canonicalBase) {
            const { canonicalBase } = userConfig.amp || {};
            userConfig.amp = userConfig.amp || {};
            userConfig.amp.canonicalBase =
                (canonicalBase.endsWith('/')
                    ? canonicalBase.slice(0, -1)
                    : canonicalBase) || '';
        }
        return assignDefaults(Object.assign({ configOrigin: constants_1.CONFIG_FILE }, userConfig));
    }
    return defaultConfig;
}
exports.default = loadConfig;
