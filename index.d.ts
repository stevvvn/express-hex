import { Express, Application } from 'express';
import { Server } from 'http';

export type SMap<T> = { [key: string]: T }

// types that convert losslessly to JSON
type JsonScalar = string | number | boolean | null;
type JsonScalarArray = JsonScalar[];
type JsonScalarObject = SMap<JsonScalar>;
type JsonShallow = JsonScalar | JsonScalarArray | JsonScalarObject;
type JsonArray = JsonShallow[];
type JsonObject = SMap<JsonShallow>;
export type Jsonish = JsonShallow | JsonArray | JsonObject;

export type LogMethod = (msg: string, ctx?: Jsonish) => void;
export type LogLevel =
  | 'emerg'
	| 'alert'
  | 'crit'
	| 'error'
	| 'warn'
  | 'notice'
  | 'info'
  | 'debug'
  | 'auth';
export type Logger = {
  [level in LogLevel]: LogMethod;
}

type Produce<T> = () => T;

export interface Conf {
  get: <T extends {}>(key?: string, def?: T | Produce<T>) => T;
	set: (key: string, val: any, setter?: (targ: any, key: string) => void) => Conf;
	push: (key: string, val: any) => Conf;
}

export type Middleware = (ctx: Context) => void | Promise<void>

export interface Context {
	express: Express;
	app: Application;
	http: Server;
	launchPath: string;
	log: Logger;
	conf: Conf;
}

export type MiddlewareDef = {
	description?: string;
	deps?: string[];
  after?: string[];
} | {
	bundle: string[]
};
export type MiddlewareDefs = SMap<MiddlewareDef>

export type AnnotatedMiddlewareDef = MiddlewareDef & {
	app: string,
	name: string
}
export type AnnotatedMiddlewareDefs = SMap<AnnotatedMiddlewareDef>

export type PackageFile = JsonObject;
