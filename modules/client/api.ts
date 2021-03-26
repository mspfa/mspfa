import axios from 'axios';
import { Dialog } from 'modules/client/dialogs';
import type { APIHandler } from 'modules/server/api';
import type { AxiosRequestConfig, AxiosInstance } from 'axios';

export type Method = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch';
/** The methods for which axios has a `data` parameter. */
export type MethodWithData = 'post' | 'put' | 'patch';

const apiExtension = {
	/** Use this config object in API requests to not reject the request's promise on HTTP 4xx errors. */
	ignoreClientErrors: { validateStatus: (status: number) => status < 500 }
};

/**
 * An [axios](https://github.com/axios/axios#readme) instance for the MSPFA API.
 * 
 * ⚠️ When using this to make API calls, use it `as` an `APIClient` type, or else you will get no type safety on the request or response.
 */
const api: (
	(
		AxiosInstance
		// This, as opposed to only writing `AxiosInstance`, mysteriously fixes TypeScript throwing "Conversion of type ... may be a mistake because neither type sufficiently overlaps with the other" when I assert `api as APIClient`.
		| Omit<AxiosInstance, Lowercase<Method>>
	)
	& typeof apiExtension
) = Object.assign(
	axios.create({
		baseURL: '/api',
		timeout: 10000
	}),
	apiExtension
);

/** This function works as if it is automatically plugged into every API call's `.catch`. */
const onReject = (error: any) => {
	console.error(error);
	
	new Dialog({
		title: 'Error',
		content: error.response?.data.message || error.message
	});
	
	return Promise.reject(error);
};
api.interceptors.request.use(
	undefined,
	onReject
);
api.interceptors.response.use(
	undefined,
	onReject
);

export default api;

/**
 * Adds type safety for client `api` calls based on the server API's exported `APIHandler` type.
 * 
 * Usage:
 * ```
 * type SomeRouteAPI = APIClient<typeof import('pages/api/some/route').default>;
 * 
 * const response = (api as SomeRouteAPI).post('some/route', { someData: true });
 * ```
 */
export type APIClient<Handler> = Omit<typeof api, Method> & (
	Handler extends APIHandler<infer Request, infer Response>
		? {
			[RequestMethod in (
				Request extends { method: Uppercase<Method> }
					? Lowercase<Request['method']>
					: Method
			)]: (
				url: string,
				...args: RequestMethod extends MethodWithData
					? Request & { method: Uppercase<RequestMethod> } extends { body: infer RequestBody }
						? [data: RequestBody & Partial<Record<string, undefined>>, config?: Omit<AxiosRequestConfig, 'data'>]
						: [data?: undefined, config?: Omit<AxiosRequestConfig, 'data'>]
					: Request & { method: Uppercase<RequestMethod> } extends { body: infer RequestBody }
						? [config: AxiosRequestConfig & { data: RequestBody & Partial<Record<string, undefined>> }]
						: [config?: Omit<AxiosRequestConfig, 'data'>]
			) => Promise<(
				Response extends { body: {} }
					? (Response & { method: Uppercase<RequestMethod> })['body']
					: unknown
			)>
		}
		: never
);