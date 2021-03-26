import { createValidator } from 'modules/server/api';

export default createValidator({
	$schema: 'http://json-schema.org/draft-07/schema#',
	$ref: '#/definitions/Request',
	definitions: {
		Request: {
			anyOf: [
				{
					type: 'object',
					properties: {
						method: {
							type: 'string',
							const: 'DELETE'
						},
						body: {
							not: {}
						}
					},
					required: [
						'method'
					]
				},
				{
					type: 'object',
					properties: {
						method: {
							type: 'string',
							const: 'POST'
						},
						body: {
							$ref: '#/definitions/SessionBody'
						}
					},
					required: [
						'method',
						'body'
					]
				}
			]
		},
		SessionBody: {
			anyOf: [
				{
					type: 'object',
					properties: {
						authMethod: {
							$ref: '#/definitions/ExternalAuthMethod'
						}
					},
					required: [
						'authMethod'
					]
				},
				{
					type: 'object',
					properties: {
						email: {
							type: 'string'
						},
						authMethod: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									const: 'password'
								},
								value: {
									type: 'string'
								}
							},
							required: [
								'type',
								'value'
							]
						}
					},
					required: [
						'email',
						'authMethod'
					]
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
			]
		}
	}
});