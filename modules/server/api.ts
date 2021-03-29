import type { NextApiRequest, NextApiResponse } from 'next';
import type { IncomingMessage } from 'http';
import Ajv from 'ajv';

/** The server-side API request object. */
export type APIRequest<
	Request extends Record<string, unknown> = { body: any }
> = (
	IncomingMessage
	& Request extends {}
		? (
			Omit<NextApiRequest, 'body' | keyof Request>
			& Request
			& { body: unknown }
		)
		: NextApiRequest
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
	Request extends Record<string, unknown> = { body: any },
	Response extends Record<string, unknown> = any
> = (
	((req: APIRequest<Request>, res: APIResponse<Response>) => void | Promise<void>)
	// This is so you can use `NonNullable<APIHandler['Request']>` and `NonNullable<APIHandler['Response']>` instead of having to use a conditional type with `infer` to get the request and response types.
	& { Request?: Request, Response?: Response }
);

export type ErrorResponseBody = { message: string };

const ajv = new Ajv({ allErrors: true });

export const createValidator = (schema: Record<string, unknown>) => {
	const validate = ajv.compile(schema);
	
	return (req: APIRequest, res: APIResponse) => (
		new Promise<void>(resolve => {
			const valid = validate(req);
			
			if (valid) {
				resolve();
			} else {
				let methodNotAllowed = false;
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
					
					// Check if the property which has a schema mismatch is `req.method`.
					if (error.dataPath === '/method') {
						methodNotAllowed = true;
						// This break is an optimization, because once error 405 is detected, we know all other errors are unused and don't need to pushed to the `errors` array.
						break;
					}
				}
				
				if (methodNotAllowed) {
					res.status(405).end();
				} else {
					let message = errorMessages.join('\n');
					if (errorMessages.length > 1) {
						message = `One or more of the following errors apply:\n${message}`;
					}
					res.status(400).send({
						message
					});
				}
			}
		})
	);
};