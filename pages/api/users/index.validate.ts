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
					const: 'POST'
				},
				body: {
					anyOf: [
						{
							type: 'object',
							properties: {
								name: {
									type: 'string'
								},
								authMethod: {
									$ref: '#/definitions/ExternalAuthMethod'
								}
							},
							required: [
								'authMethod',
								'name'
							]
						},
						{
							type: 'object',
							properties: {
								name: {
									type: 'string'
								},
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
								'authMethod',
								'email',
								'name'
							]
						}
					]
				}
			},
			required: [
				'method',
				'body'
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