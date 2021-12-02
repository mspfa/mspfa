import type { NextApiRequest, NextApiResponse } from 'next';
import type { IncomingMessage } from 'http';
import type { AnyAPIQuery } from 'lib/client/api';

/** The server-side API request object. */
export type APIRequest<
	Request extends Record<string, unknown> = { body: any, query: AnyAPIQuery }
> = (
	IncomingMessage
	& Omit<NextApiRequest, 'body' | 'query' | keyof Request>
	& Request
	& {
		body: unknown,
		query: {}
	}
);

/** The server-side API response object. */
export type APIResponse<
	Response extends Record<string, unknown> = any
> = (
	NextApiResponse<(
		Response extends { body: {} }
			? ErrorResponseBody | Response['body']
			// When `Response` does not extend `{ body: {} }`, there is no response body, so this must be `never`.
			// Additionally, this should not be `any` or `unknown` so that, in the event that one of the possible body types does not extend `{}`, the other ones that do won't all join to become `any` or `unknown`.
			: never
	)>
);

/** The server-side API handler function to be the type of an API's default export. */
export type APIHandler<
	Request extends Record<string, unknown> = { body: any, query: any },
	Response extends Record<string, unknown> = any
> = (
	((req: APIRequest<Request>, res: APIResponse<Response>) => void | Promise<void>)
	// This is so you can use `NonNullable<APIHandler['Request']>` and `NonNullable<APIHandler['Response']>` instead of having to use a conditional type with `infer` to get the request and response types.
	& {
		// This union of optional unknowns is to ensure there are no inaccurate validation errors in APIs which do not have a `body` and/or `query` in their request type.
		Request?: Request & { body?: unknown, query?: unknown },
		Response?: Response
	}
);

export type ErrorResponseBody = {
	/** A human-friendly error message. */
	message: string
};