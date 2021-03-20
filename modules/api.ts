import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { Dialog } from './dialogs';

const instance = axios.create();

export const methods = ['get', 'delete', 'head', 'options', 'post', 'put', 'patch'] as const;
export type Method = typeof methods extends ReadonlyArray<infer T> ? T : never;

type RequestArgs = Parameters<typeof instance.get>;

const request = <T = any, R = AxiosResponse<T>>(
	method: Method,
	...args: RequestArgs
) => instance[method]<T, R>(...args).catch(error => {
	new Dialog({
		title: 'Error',
		content: String(error.message)
	});
	return Promise.reject(error);
});

const api: Record<Method, typeof instance.get> = {} as any;
for (const method of methods) {
	api[method] = (...args: RequestArgs) => request(method, ...args);
}

export default api;