"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
/**
 * Utils
 */
function execOnce(fn) {
    let used = false;
    return (...args) => {
        if (!used) {
            used = true;
            fn.apply(this, args);
        }
    };
}
exports.execOnce = execOnce;
function getLocationOrigin() {
    const { protocol, hostname, port } = window.location;
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
}
exports.getLocationOrigin = getLocationOrigin;
function getURL() {
    const { href } = window.location;
    const origin = getLocationOrigin();
    return href.substring(origin.length);
}
exports.getURL = getURL;
function getDisplayName(Component) {
    return typeof Component === 'string'
        ? Component
        : Component.displayName || Component.name || 'Unknown';
}
exports.getDisplayName = getDisplayName;
function isResSent(res) {
    return res.finished || res.headersSent;
}
exports.isResSent = isResSent;
async function loadGetInitialProps(Component, ctx) {
    if (process.env.NODE_ENV !== 'production') {
        if (Component.prototype && Component.prototype.getInitialProps) {
            const message = `"${getDisplayName(Component)}.getInitialProps()" is defined as an instance method - visit https://err.sh/zeit/next.js/get-initial-props-as-an-instance-method for more information.`;
            throw new Error(message);
        }
    }
    // when called from _app `ctx` is nested in `ctx`
    const res = ctx.res || (ctx.ctx && ctx.ctx.res);
    if (!Component.getInitialProps) {
        return null;
    }
    const props = await Component.getInitialProps(ctx);
    if (res && isResSent(res)) {
        return props;
    }
    // if page component doesn't have getInitialProps
    // set cache-control header to stale-while-revalidate
    if (ctx.Component && !ctx.Component.getInitialProps) {
        const customAppGetInitialProps = Component.origGetInitialProps &&
            Component.origGetInitialProps !== Component.getInitialProps;
        if (!customAppGetInitialProps && res && res.setHeader) {
            res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
        }
    }
    if (!props) {
        const message = `"${getDisplayName(Component)}.getInitialProps()" should resolve to an object. But found "${props}" instead.`;
        throw new Error(message);
    }
    return props;
}
exports.loadGetInitialProps = loadGetInitialProps;
exports.urlObjectKeys = [
    'auth',
    'hash',
    'host',
    'hostname',
    'href',
    'path',
    'pathname',
    'port',
    'protocol',
    'query',
    'search',
    'slashes',
];
function formatWithValidation(url, options) {
    if (process.env.NODE_ENV === 'development') {
        if (url !== null && typeof url === 'object') {
            Object.keys(url).forEach(key => {
                if (exports.urlObjectKeys.indexOf(key) === -1) {
                    console.warn(`Unknown key passed via urlObject into url.format: ${key}`);
                }
            });
        }
    }
    return url_1.format(url, options);
}
exports.formatWithValidation = formatWithValidation;
