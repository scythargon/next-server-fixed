/// <reference types="node" />
import { ParsedUrlQuery } from 'querystring';
import { ComponentType } from 'react';
import { MittEmitter } from '../mitt';
import { NextPageContext } from '../utils';
export declare type BaseRouter = {
    route: string;
    pathname: string;
    query: ParsedUrlQuery;
    asPath: string;
};
declare type RouteInfo = {
    Component: ComponentType;
    props?: any;
    err?: Error;
    error?: any;
};
declare type Subscription = (data: RouteInfo, App?: ComponentType) => void;
declare type BeforePopStateCallback = (state: any) => boolean;
declare type ComponentLoadCancel = (() => void) | null;
export default class Router implements BaseRouter {
    route: string;
    pathname: string;
    query: ParsedUrlQuery;
    asPath: string;
    /**
     * Map of all components loaded in `Router`
     */
    components: {
        [pathname: string]: RouteInfo;
    };
    sub: Subscription;
    clc: ComponentLoadCancel;
    pageLoader: any;
    _bps: BeforePopStateCallback | undefined;
    static events: MittEmitter;
    constructor(pathname: string, query: ParsedUrlQuery, as: string, { initialProps, pageLoader, App, Component, err, subscription, }: {
        subscription: Subscription;
        initialProps: any;
        pageLoader: any;
        Component: ComponentType;
        App: ComponentType;
        err?: Error;
    });
    static _rewriteUrlForNextExport(url: string): string;
    onPopState: (e: PopStateEvent) => void;
    update(route: string, Component: ComponentType): void;
    reload(): void;
    /**
     * Go back in history
     */
    back(): void;
    /**
     * Performs a `pushState` with arguments
     * @param url of the route
     * @param as masks `url` for the browser
     * @param options object you can define `shallow` and other options
     */
    push(url: string, as?: string, options?: {}): Promise<boolean>;
    /**
     * Performs a `replaceState` with arguments
     * @param url of the route
     * @param as masks `url` for the browser
     * @param options object you can define `shallow` and other options
     */
    replace(url: string, as?: string, options?: {}): Promise<boolean>;
    change(method: string, _url: string, _as: string, options: any): Promise<boolean>;
    changeState(method: string, url: string, as: string, options?: {}): void;
    getRouteInfo(route: string, pathname: string, query: any, as: string, shallow?: boolean): Promise<RouteInfo>;
    set(route: string, pathname: string, query: any, as: string, data: RouteInfo): void;
    /**
     * Callback to execute before replacing router state
     * @param cb callback to be executed
     */
    beforePopState(cb: BeforePopStateCallback): void;
    onlyAHashChange(as: string): boolean;
    scrollToHash(as: string): void;
    urlIsNew(asPath: string): boolean;
    /**
     * Prefetch `page` code, you may wait for the data during `page` rendering.
     * This feature only works in production!
     * @param url of prefetched `page`
     */
    prefetch(url: string): Promise<void>;
    fetchComponent(route: string): Promise<ComponentType>;
    getInitialProps(Component: ComponentType, ctx: NextPageContext): Promise<any>;
    abortComponentLoad(as: string): void;
    notify(data: RouteInfo): void;
}
export {};
