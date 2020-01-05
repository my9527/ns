import { noop } from "./utils";

export interface AsyncFunc {
  (): Promise<any>;
}

export interface MiddlewareFunc {
  (ctx: any, next?: AsyncFunc): Promise<any>;
}

export class Middleware {
  middlewares: MiddlewareFunc[];

  constructor() {
    this.middlewares = [];
  }

  use(middleware: MiddlewareFunc) {
    this.middlewares.push(middleware);
  }

  async run(ctx: any) {
    const middlewares: MiddlewareFunc[] = [...this.middlewares];

    // 洋葱模型中间件执行， 先加入的后执行(默认)
    await middlewares.reduceRight(async (__ctx, middleware, index, arr) => {
      // 由于reduceRight 中使用了async, 下面这一步是等待结果执行
      const _ctx = await __ctx;
      arr.pop();

      // 设置了 ctx.body 后，中间件不再执行，直接返回结果
      if (_ctx.body !== undefined || !middleware) {
        return _ctx;
      }

      // 对于middle 中调用了next 的，需要先执行之后的方法，然后在继续, 这里把 next 进行实现
      const next: AsyncFunc = async () => {
        const innerMiddleware = new Middleware();
        innerMiddleware.middlewares = [...arr.splice(0, index)];
        await innerMiddleware.run(_ctx);
      };

      await middleware(_ctx, next || noop);

      return _ctx;
    }, ctx);

    return ctx;
  }
}
