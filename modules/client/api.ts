import axios from 'axios';
import type { APIHandler } from 'modules/server/api';
import type { AxiosRequestConfig, AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { Method, MethodWithData } from 'modules/types';
import { Dialog } from 'modules/client/dialogs';
import { startLoading, stopLoading } from 'components/LoadingIndicator';

export type APIError<
	Response = Record<string, unknown>
> = Record<string, unknown> & Omit<AxiosError<Response>, 'config'> & {
	config?: APIConfig<Response>,
	/** If called before the error is intercepted, prevents the error's default interception functionality (which is to display an error dialog). */
	preventDefault: () => void
};

export type APIConfig<
	Response = Record<string, unknown>
> = AxiosRequestConfig & {
	/** A function called immediately before the default error interception functionality is run. */
	beforeInterceptError?: (error: APIError<Response>) => void | Promise<void>
};

const apiExtension = {
	/** Use this config object in API requests to not reject the request's promise on HTTP error codes < 500. */
	resolveClientErrors: { validateStatus: (status: number) => status < 500 }
};

/**
 * An [axios](https://github.com/axios/axios#readme) instance for the MSPFA API.
 *
 * ⚠️ Never call this server-side.
 *
 * ⚠️ When using this to make API calls, use it `as` an `APIClient` type, or else you will get no type safety on the request or response.
 */
const api: (
	AxiosInstance
	& typeof apiExtension
) = Object.assign(
	axios.create({
		baseURL: '/api',
		timeout: 10000
	}),
	apiExtension
);

const onReject = async (error: APIError) => {
	let defaultPrevented = false;
	error.preventDefault = () => {
		defaultPrevented = true;
	};

	await error.config?.beforeInterceptError?.(error);

	if (!defaultPrevented as boolean) {
		new Dialog({
			title: 'Error',
			content: error.response?.data.message as string || error.message
		});
	}

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
	(error: APIError) => {
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
export type APIClient<Handler> = Omit<AxiosInstance, Method> & typeof apiExtension & (
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
						? [data: RequestBody, config?: Omit<APIConfig<Response['body']>, 'data'>]
						: [data?: undefined, config?: Omit<APIConfig<Response['body']>, 'data'>]
					: Request & { method: Uppercase<RequestMethod> } extends { body: infer RequestBody }
						? [config: APIConfig<Response['body']> & { data: RequestBody }]
						: [config?: Omit<APIConfig<Response['body']>, 'data'>]
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