import Ajv from 'ajv';
import replaceAll from 'lib/client/replaceAll';
import type { APIRequest, APIResponse } from 'lib/server/api';

const ajv = new Ajv({
	// This is necessary to respond to invalid API requests with comprehensive information about the errors in the request.
	allErrors: true,
	// We disable strict mode because it often unrightfully dislikes valid schemas. Strict mode also has no benefit to us anyway, only performing unnecessary checks on our schemas, since we use a script to automatically generate them which I trust to generate valid schemas.
	strict: false
});

const createAPIValidator = (methodSchema: Record<string, unknown>, schema: Record<string, unknown>) => {
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
				body: req.body,
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
						errorMessage = `${replaceAll(error.instancePath.slice(1), '/', '.')}: ${errorMessage}`;
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

export default createAPIValidator;