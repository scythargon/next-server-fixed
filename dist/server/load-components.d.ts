import { PageConfig } from 'next-server/types';
export declare function interopDefault(mod: any): any;
export declare type LoadComponentsReturnType = {
    Component: any;
    pageConfig: PageConfig;
    buildManifest?: any;
    reactLoadableManifest?: any;
    Document?: any;
    DocumentMiddleware?: any;
    App?: any;
};
export declare function loadComponents(distDir: string, buildId: string, pathname: string, serverless: boolean): Promise<LoadComponentsReturnType>;
