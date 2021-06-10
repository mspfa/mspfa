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
		// This union of optional unknowns is to ensure there are no inaccurate validation errors in APIs which do not have a `body` and/or `query` in their request type.
		Request?: Request & { body?: unknown, query?: unknown },
		Response?: Response
	}
);

export type ErrorResponseBody = {
	/** A computer-friendly error code. */
	error?: string,
	/** A human-friendly error message. */
	message: string
};

const ajv = new Ajv({
	// This is necessary to respond to invalid API requests with comprehensive information about the errors in the request.
	allErrors: true,
	// I don't know why this is necessary, but the console kept telling me `strict mode: use allowUnionTypes to allow union type keyword at "..." (strictTypes)`.
	allowUnionTypes: true
});

export const createValidator = (methodSchema: Record<string, unknown>, schema: Record<string, unknown>) => {
	const validateMethod = ajv.compile(methodSchema);
	const validate = ajv.compile(schema);

	return (req: APIRequest<any>, res: APIResponse<any>) => (
		new Promise<void>(resolve => {
			if (!validateMethod(req.method)) {
				res.status(405).end();
				return;
			}

			const valid = validate({
				method: req.method,
				body: req.body ? req.body : undefined,
				query: req.query
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

export const validateBirthdate = (
	res: NextApiResponse,
	birthdate: number
) => new Promise<void>(resolve => {
	const now = new Date();

	if (birthdate > Date.UTC(
		now.getFullYear() - 13,
		now.getMonth(),
		// Add one day to be generous to varying time zones.
		now.getDate() + 1
	)) {
		// The user is under 13 years old, which breaks the terms of service.
		res.status(400).send({
			message: 'You must be at least 13 years old.'
		});
		return;
	}

	if (birthdate < Date.UTC(
		now.getFullYear() - 200,
		now.getMonth(),
		now.getDate()
	)) {
		// The user is over 200 years old, which, as far as I know, is currently impossible.
		res.status(400).send({
			message: 'You are too old.\nYou should be dead.'
		});
		return;
	}

	resolve();
});