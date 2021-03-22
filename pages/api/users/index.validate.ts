import { createValidator } from 'modules/server/api';

const validate = createValidator({
	$schema: 'http://json-schema.org/draft-07/schema#',
	$ref: '#/definitions/Request',
	definitions: {
		Request: {
			type: 'object',
			properties: {
				method: {
					type: 'string',
					const: 'POST'
				},
				body: {
					type: 'object',
					properties: {
						authMethod: {
							$ref: '#/definitions/AuthMethod'
						},
						email: {
							type: 'string'
						}
					},
					required: [
						'authMethod'
					],
					additionalProperties: false
				}
			},
			required: [
				'method',
				'body'
			],
			additionalProperties: false
		},
		AuthMethod: {
			anyOf: [
				{
					$ref: '#/definitions/ExternalAuthMethod'
				},
				{
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'password'
						},
						value: {
							type: 'string'
						},
						legacy: {
							type: 'boolean',
							const: true,
							description: 'Whether the password was created on the old site.'
						}
					},
					required: [
						'type',
						'value'
					],
					additionalProperties: false
				}
			]
		},
		ExternalAuthMethod: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					enum: [
						'google',
						'discord'
					]
				},
				value: {
					type: 'string'
				}
			},
			required: [
				'type',
				'value'
			],
			additionalProperties: false
		}
	}
});

export default validate;