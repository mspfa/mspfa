import type { NextApiRequest, NextApiResponse } from 'next';
import { Validator } from 'jsonschema';
import type { IncomingMessage } from 'http';

export type APIRequest<
	Request extends Record<string, unknown> = Record<string, unknown>
> = (
	IncomingMessage
	& Omit<NextApiRequest, keyof Request>
	& Request
);

export type APIResponse<
	Response extends Record<string, unknown> = any
> = (
	NextApiResponse<(
		Response extends { body: {} } ? Response['body'] : any
	)>
);

export type APIHandler<
	Request extends Record<string, unknown> = Record<string, unknown>,
	Response extends Record<string, unknown> = any
> = (
	((req: APIRequest<Request>, res: APIResponse<Response>) => void | Promise<void>)
	// This is so you can use `NonNullable<APIHandler['Request']>` and `NonNullable<APIHandler['Response']>` instead of having to use a conditional type with `infer` to get the request and response types.
	& { Request?: Request, Response?: Response }
);

const validator = new Validator();

export const createValidator = (schema: Record<string, unknown>) => (
	(req: APIRequest<any>, res: APIResponse<any>) => (
		new Promise<void>(resolve => {
			const result = validator.validate(req, schema, {
				nestedErrors: true
			});
			
			let methodNotAllowed = false;
			const errorMessages: string[] = [];
			
			for (const error of result.errors) {
				if (!error.stack.includes('subschema')) {
					const errorMessage = error.stack.replace(/^instance\./, '').replace(/ a type\(s\) /g, ' type ');
					if (!errorMessages.includes(errorMessage)) {
						errorMessages.push(errorMessage);
					}
				}
				
				// Check if the property which has a schema mismatch is `req.method`.
				if (error.property === 'instance.method') {
					methodNotAllowed = true;
					// This break is an optimization, because once error 405 is detected, we know all other errors are unused and don't need to pushed to the `errors` array.
					break;
				}
			}
			
			if (result.valid) {
				resolve();
			} else if (methodNotAllowed) {
				res.status(405).end();
			} else {
				if (errorMessages.length > 1) {
					const lastIndex = errorMessages.length - 1;
					errorMessages[lastIndex] = `and/or ${errorMessages[lastIndex]}`;
				}
				res.status(400).send({
					message: `${errorMessages.join(errorMessages.length > 2 ? ',\n' : '\n')}.`
				});
			}
		})
	)
);