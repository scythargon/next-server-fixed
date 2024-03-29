"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const querystring_1 = require("querystring");
const url_1 = require("url");
const constants_1 = require("../lib/constants");
const utils_1 = require("../lib/router/utils");
const envConfig = __importStar(require("../lib/runtime-config"));
const api_utils_1 = require("./api-utils");
const config_1 = __importDefault(require("./config"));
const recursive_readdir_sync_1 = require("./lib/recursive-readdir-sync");
const load_components_1 = require("./load-components");
const render_1 = require("./render");
const require_1 = require("./require");
const router_1 = __importStar(require("./router"));
const send_html_1 = require("./send-html");
const serve_static_1 = require("./serve-static");
const utils_2 = require("./utils");
class Server {
    constructor({ dir = '.', staticMarkup = false, quiet = false, conf = null, } = {}) {
        this.dir = path_1.resolve(dir);
        this.quiet = quiet;
        const phase = this.currentPhase();
        this.nextConfig = config_1.default(phase, this.dir, conf);
        this.distDir = path_1.join(this.dir, this.nextConfig.distDir);
        // this.pagesDir = join(this.dir, 'pages')
        this.publicDir = path_1.join(this.dir, constants_1.CLIENT_PUBLIC_FILES_PATH);
        this.buildManifest = path_1.join(this.distDir, constants_1.BUILD_MANIFEST);
        // Only serverRuntimeConfig needs the default
        // publicRuntimeConfig gets it's default in client/index.js
        const { serverRuntimeConfig = {}, publicRuntimeConfig, assetPrefix, generateEtags, } = this.nextConfig;
        this.buildId = this.readBuildId();
        this.renderOpts = {
            ampBindInitData: this.nextConfig.experimental.ampBindInitData,
            poweredByHeader: this.nextConfig.poweredByHeader,
            canonicalBase: this.nextConfig.amp.canonicalBase,
            documentMiddlewareEnabled: this.nextConfig.experimental
                .documentMiddleware,
            staticMarkup,
            buildId: this.buildId,
            generateEtags,
        };
        // Only the `publicRuntimeConfig` key is exposed to the client side
        // It'll be rendered as part of __NEXT_DATA__ on the client side
        if (publicRuntimeConfig) {
            this.renderOpts.runtimeConfig = publicRuntimeConfig;
        }
        // Initialize next/config with the environment configuration
        envConfig.setConfig({
            serverRuntimeConfig,
            publicRuntimeConfig,
        });
        const routes = this.generateRoutes();
        this.router = new router_1.default(routes);
        this.setAssetPrefix(assetPrefix);
    }
    currentPhase() {
        return constants_1.PHASE_PRODUCTION_SERVER;
    }
    logError(...args) {
        if (this.quiet)
            return;
        // tslint:disable-next-line
        console.error(...args);
    }
    handleRequest(req, res, parsedUrl) {
        // Parse url if parsedUrl not provided
        if (!parsedUrl || typeof parsedUrl !== 'object') {
            const url = req.url;
            parsedUrl = url_1.parse(url, true);
        }
        // Parse the querystring ourselves if the user doesn't handle querystring parsing
        if (typeof parsedUrl.query === 'string') {
            parsedUrl.query = querystring_1.parse(parsedUrl.query);
        }
        res.statusCode = 200;
        return this.run(req, res, parsedUrl).catch(err => {
            this.logError(err);
            res.statusCode = 500;
            res.end('Internal Server Error');
        });
    }
    getRequestHandler() {
        return this.handleRequest.bind(this);
    }
    setAssetPrefix(prefix) {
        this.renderOpts.assetPrefix = prefix ? prefix.replace(/\/$/, '') : '';
    }
    // Backwards compatibility
    async prepare() { }
    // Backwards compatibility
    async close() { }
    setImmutableAssetCacheControl(res) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    generateRoutes() {
        const routes = [
            {
                match: router_1.route('/_next/static/:path*'),
                fn: async (req, res, params, parsedUrl) => {
                    // The commons folder holds commonschunk files
                    // The chunks folder holds dynamic entries
                    // The buildId folder holds pages and potentially other assets. As buildId changes per build it can be long-term cached.
                    if (params.path[0] === constants_1.CLIENT_STATIC_FILES_RUNTIME ||
                        params.path[0] === 'chunks' ||
                        params.path[0] === this.buildId) {
                        this.setImmutableAssetCacheControl(res);
                    }
                    const p = path_1.join(this.distDir, constants_1.CLIENT_STATIC_FILES_PATH, ...(params.path || []));
                    await this.serveStatic(req, res, p, parsedUrl);
                },
            },
            {
                match: router_1.route('/_next/:path*'),
                // This path is needed because `render()` does a check for `/_next` and the calls the routing again
                fn: async (req, res, _params, parsedUrl) => {
                    await this.render404(req, res, parsedUrl);
                },
            },
            {
                // It's very important to keep this route's param optional.
                // (but it should support as many params as needed, separated by '/')
                // Otherwise this will lead to a pretty simple DOS attack.
                // See more: https://github.com/zeit/next.js/issues/2617
                match: router_1.route('/static/:path*'),
                fn: async (req, res, params, parsedUrl) => {
                    const p = path_1.join(this.dir, 'static', ...(params.path || []));
                    await this.serveStatic(req, res, p, parsedUrl);
                },
            },
            {
                match: router_1.route('/api/:path*'),
                fn: async (req, res, params, parsedUrl) => {
                    const { pathname } = parsedUrl;
                    await this.handleApiRequest(req, res, pathname);
                },
            },
        ];
        if (fs_1.default.existsSync(this.publicDir)) {
            routes.push(...this.generatePublicRoutes());
        }
        if (this.nextConfig.useFileSystemPublicRoutes) {
            this.dynamicRoutes = this.getDynamicRoutes();
            // It's very important to keep this route's param optional.
            // (but it should support as many params as needed, separated by '/')
            // Otherwise this will lead to a pretty simple DOS attack.
            // See more: https://github.com/zeit/next.js/issues/2617
            routes.push({
                match: router_1.route('/:path*'),
                fn: async (req, res, _params, parsedUrl) => {
                    const { pathname, query } = parsedUrl;
                    if (!pathname) {
                        throw new Error('pathname is undefined');
                    }
                    await this.render(req, res, pathname, query, parsedUrl);
                },
            });
        }
        return routes;
    }
    /**
     * Resolves `API` request, in development builds on demand
     * @param req http request
     * @param res http response
     * @param pathname path of request
     */
    async handleApiRequest(req, res, pathname) {
        let bodyParser = true;
        let params = false;
        let resolverFunction = await this.resolveApiRequest(pathname);
        if (this.dynamicRoutes &&
            this.dynamicRoutes.length > 0 &&
            !resolverFunction) {
            for (const dynamicRoute of this.dynamicRoutes) {
                params = dynamicRoute.match(pathname);
                if (params) {
                    resolverFunction = await this.resolveApiRequest(dynamicRoute.page);
                    break;
                }
            }
        }
        if (!resolverFunction) {
            res.statusCode = 404;
            res.end('Not Found');
            return;
        }
        try {
            const resolverModule = require(resolverFunction);
            if (resolverModule.config) {
                const config = resolverModule.config;
                if (config.api && config.api.bodyParser === false) {
                    bodyParser = false;
                }
            }
            // Parsing of cookies
            api_utils_1.setLazyProp({ req }, 'cookies', api_utils_1.getCookieParser(req));
            // Parsing query string
            api_utils_1.setLazyProp({ req, params }, 'query', api_utils_1.getQueryParser(req));
            // // Parsing of body
            if (bodyParser) {
                req.body = await api_utils_1.parseBody(req);
            }
            res.status = statusCode => api_utils_1.sendStatusCode(res, statusCode);
            res.send = data => api_utils_1.sendData(res, data);
            res.json = data => api_utils_1.sendJson(res, data);
            const resolver = load_components_1.interopDefault(resolverModule);
            resolver(req, res);
        }
        catch (e) {
            if (e instanceof api_utils_1.ApiError) {
                api_utils_1.sendError(res, e.statusCode, e.message);
            }
            else {
                api_utils_1.sendError(res, 500, e.message);
            }
        }
    }
    /**
     * Resolves path to resolver function
     * @param pathname path of request
     */
    resolveApiRequest(pathname) {
        return require_1.getPagePath(pathname, this.distDir, this.nextConfig.target === 'serverless', this.renderOpts.dev);
    }
    generatePublicRoutes() {
        const routes = [];
        const publicFiles = recursive_readdir_sync_1.recursiveReadDirSync(this.publicDir);
        const serverBuildPath = path_1.join(this.distDir, this.nextConfig.target === 'serverless'
            ? constants_1.SERVERLESS_DIRECTORY
            : constants_1.SERVER_DIRECTORY);
        const pagesManifest = require(path_1.join(serverBuildPath, constants_1.PAGES_MANIFEST));
        publicFiles.forEach(path => {
            const unixPath = path.replace(/\\/g, '/');
            // Only include public files that will not replace a page path
            if (!pagesManifest[unixPath]) {
                routes.push({
                    match: router_1.route(unixPath),
                    fn: async (req, res, _params, parsedUrl) => {
                        const p = path_1.join(this.publicDir, unixPath);
                        await this.serveStatic(req, res, p, parsedUrl);
                    },
                });
            }
        });
        return routes;
    }
    getDynamicRoutes() {
        const manifest = require(this.buildManifest);
        const dynamicRoutedPages = Object.keys(manifest.pages).filter(utils_1.isDynamicRoute);
        return utils_1.getSortedRoutes(dynamicRoutedPages).map(page => ({
            page,
            match: utils_1.getRouteMatcher(utils_1.getRouteRegex(page)),
        }));
    }
    async run(req, res, parsedUrl) {
        try {
            const fn = this.router.match(req, res, parsedUrl);
            if (fn) {
                await fn();
                return;
            }
        }
        catch (err) {
            if (err.code === 'DECODE_FAILED') {
                res.statusCode = 400;
                return this.renderError(null, req, res, '/_error', {});
            }
            throw err;
        }
        if (req.method === 'GET' || req.method === 'HEAD') {
            await this.render404(req, res, parsedUrl);
        }
        else {
            res.statusCode = 501;
            res.end('Not Implemented');
        }
    }
    async sendHTML(req, res, html) {
        const { generateEtags, poweredByHeader } = this.renderOpts;
        return send_html_1.sendHTML(req, res, html, { generateEtags, poweredByHeader });
    }
    async render(req, res, pathname, query = {}, parsedUrl) {
        const url = req.url;
        if (utils_2.isInternalUrl(url)) {
            return this.handleRequest(req, res, parsedUrl);
        }
        if (utils_2.isBlockedPage(pathname)) {
            return this.render404(req, res, parsedUrl);
        }
        const html = await this.renderToHTML(req, res, pathname, query, {
            dataOnly: (this.renderOpts.ampBindInitData && Boolean(query.dataOnly)) ||
                (req.headers &&
                    (req.headers.accept || '').indexOf('application/amp.bind+json') !==
                        -1),
        });
        // Request was ended by the user
        if (html === null) {
            return;
        }
        return this.sendHTML(req, res, html);
    }
    async findPageComponents(pathname, query = {}) {
        const serverless = !this.renderOpts.dev && this.nextConfig.target === 'serverless';
        // try serving a static AMP version first
        if (query.amp) {
            try {
                return await load_components_1.loadComponents(this.distDir, this.buildId, (pathname === '/' ? '/index' : pathname) + '.amp', serverless);
            }
            catch (err) {
                if (err.code !== 'ENOENT')
                    throw err;
            }
        }
        return await load_components_1.loadComponents(this.distDir, this.buildId, pathname, serverless);
    }
    async renderToHTMLWithComponents(req, res, pathname, query = {}, result, opts) {
        // handle static page
        if (typeof result.Component === 'string') {
            return result.Component;
        }
        // handle serverless
        if (typeof result.Component === 'object' &&
            typeof result.Component.renderReqToHTML === 'function') {
            return result.Component.renderReqToHTML(req, res);
        }
        return render_1.renderToHTML(req, res, pathname, query, Object.assign({}, result, opts));
    }
    renderToHTML(req, res, pathname, query = {}, { amphtml, dataOnly, hasAmp, } = {}) {
        return this.findPageComponents(pathname, query)
            .then(result => {
            return this.renderToHTMLWithComponents(req, res, pathname, query, result, Object.assign({}, this.renderOpts, { amphtml, hasAmp, dataOnly }));
        }, err => {
            if (err.code !== 'ENOENT' || !this.dynamicRoutes) {
                return Promise.reject(err);
            }
            for (const dynamicRoute of this.dynamicRoutes) {
                const params = dynamicRoute.match(pathname);
                if (!params) {
                    continue;
                }
                return this.findPageComponents(dynamicRoute.page, query).then(result => this.renderToHTMLWithComponents(req, res, dynamicRoute.page, Object.assign({}, query, params), result, Object.assign({}, this.renderOpts, { amphtml, hasAmp, dataOnly })));
            }
            return Promise.reject(err);
        })
            .catch(err => {
            if (err && err.code === 'ENOENT') {
                res.statusCode = 404;
                return this.renderErrorToHTML(null, req, res, pathname, query);
            }
            else {
                this.logError(err);
                res.statusCode = 500;
                return this.renderErrorToHTML(err, req, res, pathname, query);
            }
        });
    }
    async renderError(err, req, res, pathname, query = {}) {
        res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
        const html = await this.renderErrorToHTML(err, req, res, pathname, query);
        if (html === null) {
            return;
        }
        return this.sendHTML(req, res, html);
    }
    async renderErrorToHTML(err, req, res, _pathname, query = {}) {
        const result = await this.findPageComponents('/_error', query);
        let html;
        try {
            html = await this.renderToHTMLWithComponents(req, res, '/_error', query, result, Object.assign({}, this.renderOpts, { err }));
        }
        catch (err) {
            console.error(err);
            res.statusCode = 500;
            html = 'Internal Server Error';
        }
        return html;
    }
    async render404(req, res, parsedUrl) {
        const url = req.url;
        const { pathname, query } = parsedUrl ? parsedUrl : url_1.parse(url, true);
        if (!pathname) {
            throw new Error('pathname is undefined');
        }
        res.statusCode = 404;
        return this.renderError(null, req, res, pathname, query);
    }
    async serveStatic(req, res, path, parsedUrl) {
        if (!this.isServeableUrl(path)) {
            return this.render404(req, res, parsedUrl);
        }
        try {
            await serve_static_1.serveStatic(req, res, path);
        }
        catch (err) {
            if (err.code === 'ENOENT' || err.statusCode === 404) {
                this.render404(req, res, parsedUrl);
            }
            else {
                throw err;
            }
        }
    }
    isServeableUrl(path) {
        const resolved = path_1.resolve(path);
        if (resolved.indexOf(path_1.join(this.distDir) + path_1.sep) !== 0 &&
            resolved.indexOf(path_1.join(this.dir, 'static') + path_1.sep) !== 0 &&
            resolved.indexOf(path_1.join(this.dir, 'public') + path_1.sep) !== 0) {
            // Seems like the user is trying to traverse the filesystem.
            return false;
        }
        return true;
    }
    readBuildId() {
        const buildIdFile = path_1.join(this.distDir, constants_1.BUILD_ID_FILE);
        try {
            return fs_1.default.readFileSync(buildIdFile, 'utf8').trim();
        }
        catch (err) {
            if (!fs_1.default.existsSync(buildIdFile)) {
                throw new Error(`Could not find a valid build in the '${this.distDir}' directory! Try building your app with 'next build' before starting the server.`);
            }
            throw err;
        }
    }
}
exports.default = Server;
