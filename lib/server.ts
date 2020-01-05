import http from "http";

import { Middleware, MiddlewareFunc } from "./middleware";

import { noop } from "./utils";

import events from "events";

export interface NSConfig {
  port?: number;
}

export interface CallbackFunc {
  (): void;
}

export interface ErrorCallback {
  (err: Error | any): void;
}

export interface NSClass {
  server: any;
  config?: NSConfig;
  _middleware: Middleware;
  createServer: () => void;
  listen: (port?: number, callback?: CallbackFunc) => void;
  use: (middleware: MiddlewareFunc) => void;
  on: (eventName: string, callback: ErrorCallback) => void;
  emit: (eventName: string, data?: any) => void;
}

const event = new events.EventEmitter();

export class NS implements NSClass {
  server: any;
  config: NSConfig;
  _middleware: Middleware;

  constructor(config?: NSConfig) {
    this.server = null;
    this.config = config || {};
    this._middleware = new Middleware();

    this.createServer();
  }

  createServer() {
    const self = this;
    this.server = http.createServer(async (request: any, response: any) => {
      const ctx = {
        body: undefined,
        req: request,
        res: response,
        fail(failedReson?: any) {
          throw failedReson;
        },
        success(data?: any) {
          ctx.body = data;
        }
      };
      try {
        await this._middleware.run(ctx);
      } catch (e) {
        console.log("error: ", e);
        self.emit("error", e, ctx);
      }
    });
  }

  listen(port?: number, callback?: CallbackFunc) {
    if (!port && this.config && !this.config.port) {
      throw new Error("server port not defined");
    }
    try {
      this.server.listen(port || (this.config && this.config.port));
      (callback || noop)();
    } catch (e) {
      throw e;
    }
  }

  /**
   * 中间件注入，中间件须是 async function
   *
   * @param   {MiddlewareFunc}  middleware  [middleware description]
   *
   * @return  {[type]}                      [return description]
   */
  use(middleware: MiddlewareFunc) {
    this._middleware.use(middleware);
  }

  /**
   * 监听事件
   *
   * @param   {string}         eventName  [eventName description]
   * @param   {ErrorCallback}  callback   [callback description]
   *
   * @return  {[type]}                    [return description]
   */
  on(eventName: string, callback: ErrorCallback) {
    event.on(eventName, (...args: any) => {
      callback.apply(null, args);
    });
  }

  /**
   * 事件广播
   *
   * @param   {[type]}  eventName:  [eventName: description]
   * @param   {[type]}  string      [string description]
   * @param   {[type]}  ...args:    [...args: description]
   * @param   {[type]}  any[]       [any[] description]
   *
   * @return  {[type]}              [return description]
   */
  emit(eventName: string, ...args: any[]) {
    event.emit(eventName, ...args);
  }
}

// module.exports = NS;
