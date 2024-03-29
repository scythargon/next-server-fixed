/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
import { ParsedUrlQuery } from 'querystring';
import { UrlWithParsedQuery } from 'url';
import Router from './router';
declare type NextConfig = any;
export declare type ServerConstructor = {
    /**
     * Where the Next project is located - @default '.'
     */
    dir?: string;
    staticMarkup?: boolean;
    /**
     * Hide error messages containing server information - @default false
     */
    quiet?: boolean;
    /**
     * Object what you would use in next.config.js - @default {}
     */
    conf?: NextConfig;
};
export default class Server {
    dir: string;
    quiet: boolean;
    nextConfig: NextConfig;
    distDir: string;
    publicDir: string;
    buildManifest: string;
    buildId: string;
    renderOpts: {
        poweredByHeader: boolean;
        ampBindInitData: boolean;
        staticMarkup: boolean;
        buildId: string;
        generateEtags: boolean;
        runtimeConfig?: {
            [key: string]: any;
        };
        assetPrefix?: string;
        canonicalBase: string;
        documentMiddlewareEnabled: boolean;
        dev?: boolean;
    };
    router: Router;
    private dynamicRoutes?;
    constructor({ dir, staticMarkup, quiet, conf, }?: ServerConstructor);
    private currentPhase;
    private logError;
    private handleRequest;
    getRequestHandler(): (req: IncomingMessage, res: ServerResponse, parsedUrl?: UrlWithParsedQuery | undefined) => Promise<void>;
    setAssetPrefix(prefix?: string): void;
    prepare(): Promise<void>;
    private close;
    private setImmutableAssetCacheControl;
    private generateRoutes;
    /**
     * Resolves `API` request, in development builds on demand
     * @param req http request
     * @param res http response
     * @param pathname path of request
     */
    private handleApiRequest;
    /**
     * Resolves path to resolver function
     * @param pathname path of request
     */
    private resolveApiRequest;
    private generatePublicRoutes;
    private getDynamicRoutes;
    private run;
    private sendHTML;
    render(req: IncomingMessage, res: ServerResponse, pathname: string, query?: ParsedUrlQuery, parsedUrl?: UrlWithParsedQuery): Promise<void>;
    private findPageComponents;
    private renderToHTMLWithComponents;
    renderToHTML(req: IncomingMessage, res: ServerResponse, pathname: string, query?: ParsedUrlQuery, { amphtml, dataOnly, hasAmp, }?: {
        amphtml?: boolean;
        hasAmp?: boolean;
        dataOnly?: boolean;
    }): Promise<string | null>;
    renderError(err: Error | null, req: IncomingMessage, res: ServerResponse, pathname: string, query?: ParsedUrlQuery): Promise<void>;
    renderErrorToHTML(err: Error | null, req: IncomingMessage, res: ServerResponse, _pathname: string, query?: ParsedUrlQuery): Promise<any>;
    render404(req: IncomingMessage, res: ServerResponse, parsedUrl?: UrlWithParsedQuery): Promise<void>;
    serveStatic(req: IncomingMessage, res: ServerResponse, path: string, parsedUrl?: UrlWithParsedQuery): Promise<void>;
    private isServeableUrl;
    private readBuildId;
}
export {};
