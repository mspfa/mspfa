import axios from 'axios';
import type { APIHandler } from 'lib/server/api';
import type { AxiosRequestConfig, AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { integer, Method, MethodWithData } from 'lib/types';
import Dialog from 'lib/client/Dialog';
import { startLoading, stopLoading } from 'components/LoadingIndicator';

// @client-only {
window.addEventListener('unhandledrejection', (
	event: Omit<PromiseRejectionEvent, 'reason'> & {
		// In reality, `reason` is `unknown`, but using `reason: unknown` here would necessitate muddying the JS logic.
		reason: ({ apiError?: boolean } & AxiosError<unknown>) | undefined
	}
) => {
	if (event.reason?.apiError) {
		// Prevent all unhandled API promise rejection errors, because there is no reason for API errors to throw uncaught errors.
		event.preventDefault();
	}
});
// @client-only }

export type AnyAPIQuery = Partial<Record<string, string | string[]>>;

export type APIError<
	ResponseBody = Record<string, unknown>,
	RequestQuery extends AnyAPIQuery = {}
> = Record<string, unknown> & Omit<AxiosError<Record<string, unknown>>, 'config'> & {
	config?: APIConfig<ResponseBody, RequestQuery>,
	/**
	 * If called before the error is intercepted, prevents the error's default interception functionality (which is to display an error dialog).
	 *
	 * The request's promise will still be rejected.
	 */
	preventDefault: () => void,
	/** Whether the error's `preventDefault` method has been called in the request's `beforeInterceptError` option. */
	readonly defaultPrevented: boolean
};

export type APIConfig<
	ResponseBody = Record<string, unknown>,
	RequestQuery extends AnyAPIQuery = {}
> = Omit<AxiosRequestConfig, 'data' | 'params'> & {
	// This has to be optional and partial because server-side route params are also on this type but should not be set by the client.
	// The limitations in Next mentioned below are that there is no official distinction between query parameters and route parameters.
	/**
	 * The query parameters.
	 *
	 * ⚠️ This property is not necessarily type-safe due to limitations in Next, so any required parameters will appear optional.
	 */
	params?: Partial<RequestQuery>,
	/** A function called immediately before the default error interception functionality is run. */
	beforeInterceptError?: (error: APIError<ResponseBody>) => void | Promise<void>
};

const apiExtension = {
	/** Use this config object in API requests to not reject the request's promise on HTTP error codes < 500. */
	resolveClientErrors: { validateStatus: (status: integer) => status < 500 }
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
	// This is set so the error can be ignored when it is later identified as an API error.
	error.apiError = true;

	// This is set as a property of `error` so it can be read in the request's rejection handler after `preventDefault` is called.
	(error as any).defaultPrevented = false;

	error.preventDefault = () => {
		(error as any).defaultPrevented = true;
	};

	await error.config?.beforeInterceptError?.(error);

	if (!(error.defaultPrevented || error instanceof axios.Cancel)) {
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

		if (value.data !== undefined) {
			if (!value.headers) {
				value.headers = {};
			}

			value.headers['Content-Type'] = 'application/json';
		}

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

type APIClientArgs<
	Request extends Record<string, unknown>,
	Response extends Record<string, unknown>,
	RequestMethod extends Method,
	RequestQuery extends AnyAPIQuery = {}
> = (
	RequestMethod extends MethodWithData
		? Request & { method: Uppercase<RequestMethod> } extends { body: infer RequestBody }
			? [data: RequestBody, config?: APIConfig<Response['body'], RequestQuery>]
			: [data?: undefined, config?: APIConfig<Response['body'], RequestQuery>]
		: Request & { method: Uppercase<RequestMethod> } extends { body: infer RequestBody }
			? [config: APIConfig<Response['body'], RequestQuery> & { data: RequestBody }]
			: [config?: APIConfig<Response['body'], RequestQuery>]
);

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
				...args: Request & { method: Uppercase<RequestMethod> } extends { query: infer RequestQuery }
					? APIClientArgs<Request, Response, RequestMethod, RequestQuery>
					: APIClientArgs<Request, Response, RequestMethod>
			) => Promise<(
				AxiosResponse<(
					Response & { method: Uppercase<RequestMethod> } extends { body: {} }
						? (Response & { method: Uppercase<RequestMethod> })['body']
						: never
				)>
			)>
		}
		: never
);