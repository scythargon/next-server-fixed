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
const react_1 = __importDefault(require("react"));
const server_1 = require("react-dom/server");
const mitt_1 = __importDefault(require("../lib/mitt"));
const utils_1 = require("../lib/utils");
const head_1 = __importStar(require("../lib/head"));
// @ts-ignore types will be added later as it's an internal module
const loadable_1 = __importDefault(require("../lib/loadable"));
const data_manager_context_1 = require("../lib/data-manager-context");
const request_context_1 = require("../lib/request-context");
const loadable_context_1 = require("../lib/loadable-context");
const router_context_1 = require("../lib/router-context");
const data_manager_1 = require("../lib/data-manager");
const get_page_files_1 = require("./get-page-files");
const amp_context_1 = require("../lib/amp-context");
const optimize_amp_1 = __importDefault(require("./optimize-amp"));
const amp_1 = require("../lib/amp");
function noRouter() {
    const message = 'No router instance found. you should only use "next/router" inside the client side of your app. https://err.sh/zeit/next.js/no-router-instance';
    throw new Error(message);
}
class ServerRouter {
    constructor(pathname, query, as) {
        this.route = pathname.replace(/\/$/, '') || '/';
        this.pathname = pathname;
        this.query = query;
        this.asPath = as;
        this.pathname = pathname;
    }
    // @ts-ignore
    push() {
        noRouter();
    }
    // @ts-ignore
    replace() {
        noRouter();
    }
    // @ts-ignore
    reload() {
        noRouter();
    }
    back() {
        noRouter();
    }
    // @ts-ignore
    prefetch() {
        noRouter();
    }
    beforePopState() {
        noRouter();
    }
}
// TODO: Remove in the next major version, as this would mean the user is adding event listeners in server-side `render` method
ServerRouter.events = mitt_1.default();
function enhanceComponents(options, App, Component) {
    // For backwards compatibility
    if (typeof options === 'function') {
        return {
            App,
            Component: options(Component),
        };
    }
    return {
        App: options.enhanceApp ? options.enhanceApp(App) : App,
        Component: options.enhanceComponent
            ? options.enhanceComponent(Component)
            : Component,
    };
}
function render(renderElementToString, element, ampMode) {
    let html;
    let head;
    try {
        html = renderElementToString(element);
    }
    finally {
        head = head_1.default.rewind() || head_1.defaultHead(undefined, amp_1.isInAmpMode(ampMode));
    }
    return { html, head };
}
function renderDocument(Document, { dataManagerData, props, docProps, pathname, query, buildId, canonicalBase, dynamicBuildId = false, assetPrefix, runtimeConfig, nextExport, dynamicImportsIds, dangerousAsPath, err, dev, ampPath, ampState, inAmpMode, hybridAmp, staticMarkup, devFiles, files, dynamicImports, }) {
    return ('<!DOCTYPE html>' +
        server_1.renderToStaticMarkup(react_1.default.createElement(amp_context_1.AmpStateContext.Provider, { value: ampState },
            react_1.default.createElement(Document, Object.assign({ __NEXT_DATA__: {
                    dataManager: dataManagerData,
                    props,
                    page: pathname,
                    query,
                    buildId,
                    dynamicBuildId,
                    assetPrefix: assetPrefix === '' ? undefined : assetPrefix,
                    runtimeConfig,
                    nextExport,
                    dynamicIds: dynamicImportsIds.length === 0 ? undefined : dynamicImportsIds,
                    err: err ? serializeError(dev, err) : undefined,
                }, dangerousAsPath: dangerousAsPath, canonicalBase: canonicalBase, ampPath: ampPath, inAmpMode: inAmpMode, hybridAmp: hybridAmp, staticMarkup: staticMarkup, devFiles: devFiles, files: files, dynamicImports: dynamicImports, assetPrefix: assetPrefix }, docProps)))));
}
async function renderToHTML(req, res, pathname, query, renderOpts) {
    pathname = pathname === '/index' ? '/' : pathname;
    const { err, dev = false, documentMiddlewareEnabled = false, ampBindInitData = false, staticMarkup = false, ampPath = '', App, Document, pageConfig, DocumentMiddleware, Component, buildManifest, reactLoadableManifest, ErrorDebug, } = renderOpts;
    await loadable_1.default.preloadAll(); // Make sure all dynamic imports are loaded
    let isStaticPage = Boolean(pageConfig.experimentalPrerender);
    if (dev) {
        const { isValidElementType } = require('react-is');
        if (!isValidElementType(Component)) {
            throw new Error(`The default export is not a React Component in page: "${pathname}"`);
        }
        if (!isValidElementType(App)) {
            throw new Error(`The default export is not a React Component in page: "/_app"`);
        }
        if (!isValidElementType(Document)) {
            throw new Error(`The default export is not a React Component in page: "/_document"`);
        }
        isStaticPage = typeof Component.getInitialProps !== 'function';
        const defaultAppGetInitialProps = App.getInitialProps === App.origGetInitialProps;
        isStaticPage = isStaticPage && defaultAppGetInitialProps;
        if (isStaticPage) {
            // remove query values except ones that will be set during export
            query = {
                amp: query.amp,
            };
            renderOpts.nextExport = true;
        }
    }
    // @ts-ignore url will always be set
    const asPath = req.url;
    const ctx = {
        err,
        req: isStaticPage ? undefined : req,
        res: isStaticPage ? undefined : res,
        pathname,
        query,
        asPath,
    };
    const router = new ServerRouter(pathname, query, asPath);
    let props;
    if (documentMiddlewareEnabled && typeof DocumentMiddleware === 'function') {
        await DocumentMiddleware(ctx);
    }
    try {
        props = await utils_1.loadGetInitialProps(App, { Component, router, ctx });
    }
    catch (err) {
        if (!dev || !err)
            throw err;
        ctx.err = err;
        renderOpts.err = err;
    }
    // the response might be finished on the getInitialProps call
    if (utils_1.isResSent(res))
        return null;
    const devFiles = buildManifest.devFiles;
    const files = [
        ...new Set([
            ...get_page_files_1.getPageFiles(buildManifest, pathname),
            ...get_page_files_1.getPageFiles(buildManifest, '/_app'),
        ]),
    ];
    let dataManager;
    if (ampBindInitData) {
        dataManager = new data_manager_1.DataManager();
    }
    const ampState = {
        ampFirst: pageConfig.amp === true,
        hasQuery: Boolean(query.amp),
        hybrid: pageConfig.amp === 'hybrid',
    };
    const reactLoadableModules = [];
    const renderElementToString = staticMarkup
        ? server_1.renderToStaticMarkup
        : server_1.renderToString;
    const renderPageError = () => {
        if (ctx.err && ErrorDebug) {
            return render(renderElementToString, react_1.default.createElement(ErrorDebug, { error: ctx.err }), ampState);
        }
        if (dev && (props.router || props.Component)) {
            throw new Error(`'router' and 'Component' can not be returned in getInitialProps from _app.js https://err.sh/zeit/next.js/cant-override-next-props`);
        }
    };
    let renderPage;
    if (ampBindInitData) {
        const ssrPrepass = require('react-ssr-prepass');
        renderPage = async (options = {}) => {
            const renderError = renderPageError();
            if (renderError)
                return renderError;
            const { App: EnhancedApp, Component: EnhancedComponent, } = enhanceComponents(options, App, Component);
            const Application = () => (react_1.default.createElement(request_context_1.RequestContext.Provider, { value: req },
                react_1.default.createElement(router_context_1.RouterContext.Provider, { value: router },
                    react_1.default.createElement(data_manager_context_1.DataManagerContext.Provider, { value: dataManager },
                        react_1.default.createElement(amp_context_1.AmpStateContext.Provider, { value: ampState },
                            react_1.default.createElement(loadable_context_1.LoadableContext.Provider, { value: moduleName => reactLoadableModules.push(moduleName) },
                                react_1.default.createElement(EnhancedApp, Object.assign({ Component: EnhancedComponent, router: router }, props))))))));
            const element = react_1.default.createElement(Application, null);
            try {
                return render(renderElementToString, element, ampState);
            }
            catch (err) {
                if (err && typeof err === 'object' && typeof err.then === 'function') {
                    await ssrPrepass(element);
                    if (renderOpts.dataOnly) {
                        return {
                            html: '',
                            head: [],
                            dataOnly: true,
                        };
                    }
                    else {
                        return render(renderElementToString, element, ampState);
                    }
                }
                throw err;
            }
        };
    }
    else {
        renderPage = (options = {}) => {
            const renderError = renderPageError();
            if (renderError)
                return renderError;
            const { App: EnhancedApp, Component: EnhancedComponent, } = enhanceComponents(options, App, Component);
            return render(renderElementToString, react_1.default.createElement(request_context_1.RequestContext.Provider, { value: req },
                react_1.default.createElement(router_context_1.RouterContext.Provider, { value: router },
                    react_1.default.createElement(amp_context_1.AmpStateContext.Provider, { value: ampState },
                        react_1.default.createElement(loadable_context_1.LoadableContext.Provider, { value: moduleName => reactLoadableModules.push(moduleName) },
                            react_1.default.createElement(EnhancedApp, Object.assign({ Component: EnhancedComponent, router: router }, props)))))), ampState);
        };
    }
    const docProps = await utils_1.loadGetInitialProps(Document, Object.assign({}, ctx, { renderPage }));
    // the response might be finished on the getInitialProps call
    if (utils_1.isResSent(res))
        return null;
    let dataManagerData = '[]';
    if (dataManager) {
        dataManagerData = JSON.stringify([...dataManager.getData()]);
    }
    if (!docProps || typeof docProps.html !== 'string') {
        const message = `"${utils_1.getDisplayName(Document)}.getInitialProps()" should resolve to an object with a "html" prop set with a valid html string`;
        throw new Error(message);
    }
    if (docProps.dataOnly) {
        return dataManagerData;
    }
    const dynamicImportIdsSet = new Set();
    const dynamicImports = [];
    for (const mod of reactLoadableModules) {
        const manifestItem = reactLoadableManifest[mod];
        if (manifestItem) {
            manifestItem.map(item => {
                dynamicImports.push(item);
                dynamicImportIdsSet.add(item.id);
            });
        }
    }
    const dynamicImportsIds = [...dynamicImportIdsSet];
    const inAmpMode = amp_1.isInAmpMode(ampState);
    const hybridAmp = ampState.hybrid;
    // update renderOpts so export knows current state
    renderOpts.inAmpMode = inAmpMode;
    renderOpts.hybridAmp = hybridAmp;
    renderOpts.pageData = props && props.pageProps;
    renderOpts.isPrerender =
        pageConfig.experimentalPrerender === true ||
            pageConfig.experimentalPrerender === 'inline';
    let html = renderDocument(Document, Object.assign({}, renderOpts, { dangerousAsPath: router.asPath, dataManagerData,
        ampState,
        props,
        docProps,
        pathname,
        ampPath,
        query,
        inAmpMode,
        hybridAmp,
        dynamicImportsIds,
        dynamicImports,
        files,
        devFiles }));
    if (inAmpMode && html) {
        // use replace to allow rendering directly to body in AMP mode
        html = html.replace('__NEXT_AMP_RENDER_TARGET__', `<!-- __NEXT_DATA__ -->${docProps.html}`);
        html = await optimize_amp_1.default(html);
        if (renderOpts.ampValidator) {
            await renderOpts.ampValidator(html, pathname);
        }
    }
    if (inAmpMode || hybridAmp) {
        // fix &amp being escaped for amphtml rel link
        html = html.replace(/&amp;amp=1/g, '&amp=1');
    }
    return html;
}
exports.renderToHTML = renderToHTML;
function errorToJSON(err) {
    const { name, message, stack } = err;
    return { name, message, stack };
}
function serializeError(dev, err) {
    if (dev) {
        return errorToJSON(err);
    }
    return {
        name: 'Internal Server Error.',
        message: '500 - Internal Server Error.',
        statusCode: 500,
    };
}
