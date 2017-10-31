'use strict';
// @flow

import * as Express from './express-types';

export type SMap<T> = { [ key: string ]: T }

export type LogMethod = (msg: string, ctx?: Jsonish) => void
export type Logger = {
	emerg: LogMethod,
	alert: LogMethod,
	crit: LogMethod,
	error: LogMethod,
	warn: LogMethod,
	notice: LogMethod,
	info: LogMethod,
	debug: LogMethod
}

// types that convert losslessly to JSON
export type JsonScalar = string|number|boolean|null;
export type JsonArray = Array<JsonScalar>
export type JsonObject = SMap<JsonArray|JsonScalar|JsonObject>
export type Jsonish = JsonScalar|JsonArray|JsonObject

export interface Conf {
	get: (key?: string, def?: any) => any,
	set: (key: string, val: any, setter?: ?(targ: any, key: string) => void) => Conf,
	push: (key: string, val: any) => Conf
};

export interface App extends Express.Application {}

/**
 * Should really be something like:
 * {
 * 	description?: string,
 * 	deps?: string[],
 * 	after?: string[]
 * } | {
 * 	bundle: string[]
 * }
 *
 * because if a middleware provides a bundle list (a list of middleware that it is an aliase for)
 * it cannot provide any of the other fields.
 *
 * However, Flow doesn't allow checking if which of these properties exist when typed thusly.
 */
export type MiddlewareDef = {
	description?: string,
	deps?: string[],
	after?: string[],
	bundle?: string[]
};
export type MiddlewareDefs = SMap<MiddlewareDef>

// used internally by the middleware library, but app and middleware name are otherwise implied by context
export type AnnotatedMiddlewareDef = MiddlewareDef & {
	app: string,
	name: string
}
export type AnnotatedMiddlewareDefs = SMap<AnnotatedMiddlewareDef>

// impossible to instantiate, used for functions that cannot return
// (while (true); process.exit(); etc)
export type Never = Never
