import React from 'react';
export declare function defaultHead(className?: string, inAmpMode?: boolean): JSX.Element[];
/**
 * This component injects elements to `<head>` of your page.
 * To avoid duplicated `tags` in `<head>` you can use the `key` property, which will make sure every tag is only rendered once.
 */
declare function Head({ children }: {
    children: React.ReactNode;
}): JSX.Element;
declare namespace Head {
    var rewind: () => React.ReactElement<any, string | ((props: any) => React.ReactElement<any, string | any | (new (props: any) => React.Component<any, any, any>)> | null) | (new (props: any) => React.Component<any, any, any>)>[] | undefined;
}
export default Head;
