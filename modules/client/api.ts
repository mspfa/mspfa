import axios from 'axios';
import type { APIHandler } from 'modules/server/api';
import type { AxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios';
import type { Method, MethodWithData } from 'modules/types';
import { Dialog } from 'modules/client/dialogs';
import { startLoading, stopLoading } from 'components/LoadingIndicator';

const apiExtension = {
	/** Use this config object in API requests to not reject the request's promise on HTTP 4xx errors. */
	ignoreClientErrors: { validateStatus: (status: number) => status < 500 }
};

/**
 * An [axios](https://github.com/axios/axios#readme) instance for the MSPFA API.
 *
 * ⚠️ Never call this server-side.
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

const onReject = (error: any) => {
	new Dialog({
		title: 'Error',
		content: error.response?.data.message || error.message
	});

	return Promise.reject(error);
};
api.interceptors.request.use(
	value => {
		startLoading();
		return value;
	},
	onReject
);
api.interceptors.response.use(
	value => {
		stopLoading();
		return value;
	},
	error => {
		stopLoading();
		return onReject(error);
	}
);

export default api;

/**
 * Adds type safety for client `api` calls based on the server API's exported `APIHandler` type.
 *
 * Usage:
 * ```
 * type SomeRouteAPI = APIClient<typeof import('pages/api/some/route').default>;
 *
 * (api as SomeRouteAPI).post('some/route', { someData: true });
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
						? [data: RequestBody, config?: Omit<AxiosRequestConfig, 'data'>]
						: [data?: undefined, config?: Omit<AxiosRequestConfig, 'data'>]
					: Request & { method: Uppercase<RequestMethod> } extends { body: infer RequestBody }
						? [config: AxiosRequestConfig & { data: RequestBody }]
						: [config?: Omit<AxiosRequestConfig, 'data'>]
			) => Promise<(
				AxiosResponse<(
					Response extends { body: {} }
						? (Response & { method: Uppercase<RequestMethod> })['body']
						: unknown
				)>
			)>
		}
		: never
);