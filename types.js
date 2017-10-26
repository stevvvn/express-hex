'use strict';
// @flow

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

export type JsonScalar = string|number|boolean|null;
export type JsonArray = Array<JsonScalar>
export type JsonObject = SMap<JsonArray|JsonScalar|JsonObject>
export type Jsonish = JsonScalar|JsonArray|JsonObject

export interface Conf {
	get: (key?: string, def?: any) => any
};
