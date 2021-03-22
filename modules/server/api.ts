import type { NextApiRequest, NextApiResponse } from 'next';
import { Validator } from 'jsonschema';

type UnknownObject = Record<string, unknown> | unknown[];

export type APIRequest<Request extends UnknownObject = UnknownObject> = (
	'body' extends keyof Request
		? Omit<NextApiRequest, 'body'> & { body: Request['body'] }
		: NextApiRequest
);

export type APIResponse<ResponseBody extends UnknownObject = UnknownObject> = Omit<NextApiResponse<ResponseBody>, 'body'>;

export type APIHandler<
	Request extends UnknownObject = UnknownObject,
	ResponseBody extends UnknownObject = UnknownObject
> = (req: APIRequest<Request>, res: APIResponse<ResponseBody>) => void | Promise<void>;

const validator = new Validator();
console.log(validator);

export const createValidator = (schema: Record<string, unknown>) => (
	(req: APIRequest<any>, res: APIResponse<any>) => (
		new Promise<void>(resolve => {
			const result = validator.validate(req, schema, {
				nestedErrors: true
			});
			
			const errors: typeof result.errors = [];
			
			let methodNotAllowed = false;
			
			for (const error of result.errors) {
				if (error.name !== 'additionalProperties') {
					errors.push(error);
				}
				
				if (error.property === 'instance.method') {
					methodNotAllowed = true;
					// This break is an optimization, because once error 405 is detected, we know all other errors are unused and don't need to pushed to the `errors` array.
					break;
				}
			}
			
			if (errors.length === 0) {
				resolve();
			} else if (methodNotAllowed) {
				res.status(405).end();
			} else {
				res.status(400).send({
					message: errors.map(error => error.stack).join('\n')
				});
			}
		})
	)
);