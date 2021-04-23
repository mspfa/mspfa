import type { NextApiRequest, NextApiResponse } from 'next';
import type { IncomingMessage } from 'http';
import type { AnyAPIQuery } from 'modules/client/api';
import Ajv from 'ajv';

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
			: any
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
		Request?: Request & { body?: unknown },
		Response?: Response
	}
);

export type ErrorResponseBody = { message: string };

const ajv = new Ajv({ allErrors: true });

export const createValidator = (methodSchema: Record<string, unknown>, schema: Record<string, unknown>) => {
	const validateMethod = ajv.compile(methodSchema);
	const validate = ajv.compile(schema);

	return (req: APIRequest, res: APIResponse) => (
		new Promise<void>(resolve => {
			if (!validateMethod(req.method)) {
				res.status(405).end();
				return;
			}

			validate({
				method: req.method,
				body: req.body ? req.body : undefined
			});

			const valid = validate({
				method: req.method,
				body: req.body ? req.body : undefined
			});

			if (valid) {
				resolve();
			} else {
				const errorMessages: string[] = [];

				for (const error of validate.errors!) {
					let errorMessage = error.message!;
					// Filter out unhelpful error messages.
					if (!errorMessage.includes('schema')) {
						errorMessage = `${error.dataPath.slice(1).replace(/\//g, '.')}: ${errorMessage}`;
						if (!errorMessages.includes(errorMessage)) {
							errorMessages.push(errorMessage);
						}
					}
				}

				let message = errorMessages.join('\n');
				if (errorMessages.length > 1) {
					message = `One or more of the following errors apply:\n${message}`;
				}
				res.status(400).send({
					message
				});
			}
		})
	);
};