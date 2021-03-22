import { createValidator } from 'modules/server/api';

export default createValidator({
	$schema: 'http://json-schema.org/draft-07/schema#',
	$ref: '#/definitions/Request',
	definitions: {
		Request: {
			type: 'object',
			properties: {
				method: {
					type: 'string',
					const: 'GET'
				}
			},
			required: [
				'method'
			]
		}
	}
});