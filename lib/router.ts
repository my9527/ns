import { AsyncFunc, MiddlewareFunc } from "./middleware";

import {
  pathToRegexp,
  match,
  MatchFunction,
  MatchResult
} from "path-to-regexp";

type RouterMethods = "POST" | "GET" | "DELETE" | "OPTION";

interface RouterConfig {
  url: "string";
  method: RouterMethods;
}

interface RouterResolver {
  func: (ctx: any, next?: AsyncFunc) => void;
  keys: any[];
  method: RouterMethods;
  url: string;
  regex: RegExp;
}

abstract class BaseRouter {
  prefix: string;

  routerMap: any;

  constructor() {
    this.prefix = "";
    this.routerMap = {};
  }

  abstract setPrefix(prefix: string): void;
  abstract resolveUrl(url: string): any;
  abstract register(config: RouterConfig, resolver: MiddlewareFunc): void;
  abstract routes(): MiddlewareFunc;
}

export default class Router implements BaseRouter {
  prefix: string;
  routerMap: any;

  constructor() {
    this.prefix = "";
    this.routerMap = {};
  }

  setPrefix(prefix: string) {
    this.prefix = prefix;
  }

  resolveUrl(url: string) {
    const [pathname, query] = url.split("?");
    return {
      pathname,
      query
    };
  }

  register(routerConfig: RouterConfig, routerResolverFunc: MiddlewareFunc) {
    const { method, url } = routerConfig;
    const keys = <any>[];
    const regex = pathToRegexp(url, keys);
    this.routerMap[url] = {
      func: routerResolverFunc,
      keys,
      method,
      url,
      regex
    };
  }

  routes() {
    const self = this;
    return async (ctx: any, next?: AsyncFunc) => {
      const { url, method } = ctx.req;

      const { pathname } = self.resolveUrl(url);

      let resolverFunc: RouterResolver | null = null;
      let params = <any>[];

      const resolver = Object.keys(self.routerMap).some(
        (name: string): boolean => {
          const routerResolver: RouterResolver = self.routerMap[name];
          const { regex } = routerResolver;

          const isMatched: boolean =
            method === routerResolver.method && regex.test(pathname);
          resolverFunc = routerResolver;
          if (isMatched) {
            const _match: MatchFunction = match(name, {
              decode: decodeURIComponent
            });
            const _matchResult: MatchResult<object> | boolean = _match(
              pathname
            );
            if (_matchResult) {
              params = <MatchResult>_matchResult.params;
            }
          }
          return isMatched;
        }
      );
      if (resolver) {
        ctx.params = params;
        ((resolverFunc as unknown) as RouterResolver).func(ctx, next);
      }
    };
  }
}
