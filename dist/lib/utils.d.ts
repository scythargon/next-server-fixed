/// <reference types="node" />
import { UrlObject, URLFormatOptions } from 'url';
import { ServerResponse, IncomingMessage } from 'http';
import { ComponentType } from 'react';
import { ParsedUrlQuery } from 'querystring';
import { ManifestItem } from '../server/render';
import { BaseRouter } from './router/router';
/**
 * Types used by both next and next-server
 */
export declare type NextComponentType<C extends BaseContext = NextPageContext, IP = {}, P = {}> = ComponentType<P> & {
    getInitialProps?(context: C): Promise<IP>;
};
export declare type DocumentType = NextComponentType<DocumentContext, DocumentInitialProps, DocumentProps>;
export declare type AppType = NextComponentType<AppContextType, AppInitialProps, AppPropsType>;
export declare type Enhancer<C> = (Component: C) => C;
export declare type ComponentsEnhancer = {
    enhanceApp?: Enhancer<AppType>;
    enhanceComponent?: Enhancer<NextComponentType>;
} | Enhancer<NextComponentType>;
export declare type RenderPageResult = {
    html: string;
    head?: Array<JSX.Element | null>;
    dataOnly?: true;
};
export declare type RenderPage = (options?: ComponentsEnhancer) => RenderPageResult | Promise<RenderPageResult>;
export declare type BaseContext = {
    res?: ServerResponse;
    [k: string]: any;
};
export declare type NEXT_DATA = {
    dataManager: string;
    props: any;
    page: string;
    query: ParsedUrlQuery;
    buildId: string;
    dynamicBuildId: boolean;
    assetPrefix?: string;
    runtimeConfig?: {
        [key: string]: any;
    };
    nextExport?: boolean;
    dynamicIds?: string[];
    err?: Error & {
        statusCode?: number;
    };
};
/**
 * `Next` context
 */
export interface NextPageContext {
    /**
     * Error object if encountered during rendering
     */
    err?: Error & {
        statusCode?: number;
    } | null;
    /**
     * `HTTP` request object.
     */
    req?: IncomingMessage;
    /**
     * `HTTP` response object.
     */
    res?: ServerResponse;
    /**
     * Path section of `URL`.
     */
    pathname: string;
    /**
     * Query string section of `URL` parsed as an object.
     */
    query: ParsedUrlQuery;
    /**
     * `String` of the actual path including query.
     */
    asPath?: string;
}
export declare type AppContextType<R extends BaseRouter = BaseRouter> = {
    Component: NextComponentType<NextPageContext>;
    router: R;
    ctx: NextPageContext;
};
export declare type AppInitialProps = {
    pageProps: any;
};
export declare type AppPropsType<R extends BaseRouter = BaseRouter, P = {}> = AppInitialProps & {
    Component: NextComponentType<NextPageContext, any, P>;
    router: R;
};
export declare type DocumentContext = NextPageContext & {
    renderPage: RenderPage;
};
export declare type DocumentInitialProps = RenderPageResult & {
    styles?: React.ReactElement[];
};
export declare type DocumentProps = DocumentInitialProps & {
    __NEXT_DATA__: NEXT_DATA;
    dangerousAsPath: string;
    ampPath: string;
    inAmpMode: boolean;
    hybridAmp: boolean;
    staticMarkup: boolean;
    devFiles: string[];
    files: string[];
    dynamicImports: ManifestItem[];
    assetPrefix?: string;
    canonicalBase: string;
};
/**
 * Next `API` route request
 */
export declare type NextApiRequest = IncomingMessage & {
    /**
     * Object of `query` values from url
     */
    query: {
        [key: string]: string | string[];
    };
    /**
     * Object of `cookies` from header
     */
    cookies: {
        [key: string]: string;
    };
    body: any;
};
/**
 * Send body of response
 */
declare type Send = (body: any) => void;
/**
 * Next `API` route response
 */
export declare type NextApiResponse = ServerResponse & {
    /**
     * Send data `any` data in reponse
     */
    send: Send;
    /**
     * Send data `json` data in reponse
     */
    json: Send;
    status: (statusCode: number) => void;
};
/**
 * Utils
 */
export declare function execOnce(this: any, fn: () => any): (...args: any) => void;
export declare function getLocationOrigin(): string;
export declare function getURL(): string;
export declare function getDisplayName(Component: ComponentType<any>): string;
export declare function isResSent(res: ServerResponse): boolean;
export declare function loadGetInitialProps<C extends BaseContext, IP = {}, P = {}>(Component: NextComponentType<C, IP, P>, ctx: C): Promise<IP | null>;
export declare const urlObjectKeys: string[];
export declare function formatWithValidation(url: UrlObject, options?: URLFormatOptions): string;
export {};
