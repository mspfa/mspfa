import type { NextApiRequest, NextApiResponse } from 'next';
import { Validator } from 'jsonschema';
import type { IncomingMessage } from 'http';

type UnknownObject = Record<string, unknown> | unknown[];

export type APIRequest<Request extends UnknownObject = UnknownObject> = (
	IncomingMessage
	& Omit<NextApiRequest, keyof Request>
	& Request
);

export type APIResponse<ResponseBody extends UnknownObject = UnknownObject> = NextApiResponse<ResponseBody>;

export type APIHandler<
	Request extends UnknownObject = UnknownObject,
	ResponseBody extends UnknownObject = UnknownObject
> = (req: APIRequest<Request>, res: APIResponse<ResponseBody>) => void | Promise<void>;

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
			
			if (errorMessages.length) {
				if (methodNotAllowed) {
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
			} else {
				resolve();
			}
		})
	)
);