// This file is automatically generated by `scripts/generate-validators`. Do not edit directly.

import { createValidator } from 'lib/server/api';

export default createValidator({
	$schema: 'http://json-schema.org/draft-07/schema#',
	$ref: '#/definitions/RequestMethod',
	definitions: {
		RequestMethod: {
			type: 'string',
			enum: [
				'GET',
				'DELETE',
				'PUT'
			]
		}
	}
}, {
	$schema: 'http://json-schema.org/draft-07/schema#',
	$ref: '#/definitions/Request',
	definitions: {
		'Request': {
			anyOf: [
				{
					type: 'object',
					additionalProperties: false,
					properties: {
						body: {},
						query: {
							type: 'object',
							properties: {
								storyID: {
									type: 'string'
								},
								pageID: {
									type: 'string'
								},
								commentID: {
									type: 'string'
								}
							},
							required: [
								'storyID',
								'pageID',
								'commentID'
							],
							additionalProperties: false
						},
						method: {
							type: 'string',
							const: 'GET'
						}
					},
					required: [
						'method',
						'query'
					]
				},
				{
					type: 'object',
					additionalProperties: false,
					properties: {
						body: {},
						query: {
							type: 'object',
							properties: {
								storyID: {
									type: 'string'
								},
								pageID: {
									type: 'string'
								},
								commentID: {
									type: 'string'
								}
							},
							required: [
								'storyID',
								'pageID',
								'commentID'
							],
							additionalProperties: false
						},
						method: {
							type: 'string',
							const: 'DELETE'
						}
					},
					required: [
						'method',
						'query'
					]
				},
				{
					type: 'object',
					additionalProperties: false,
					properties: {
						body: {
							$ref: '#/definitions/RecursivePartial%3Calias-731470504-70263-70404-731470504-0-212510%3Cdef-alias--308-637--0-6371413154152%2Calias-1603872257-619-776-1603872257-0-4243659861602%3E%3E'
						},
						query: {
							type: 'object',
							properties: {
								storyID: {
									type: 'string'
								},
								pageID: {
									type: 'string'
								},
								commentID: {
									type: 'string'
								}
							},
							required: [
								'storyID',
								'pageID',
								'commentID'
							],
							additionalProperties: false
						},
						method: {
							type: 'string',
							const: 'PUT'
						}
					},
					required: [
						'body',
						'method',
						'query'
					]
				}
			]
		},
		'RecursivePartial<alias-731470504-70263-70404-731470504-0-212510<def-alias--308-637--0-6371413154152,alias-1603872257-619-776-1603872257-0-4243659861602>>': {
			type: 'object',
			properties: {
				content: {
					type: 'string',
					minLength: 1,
					maxLength: 2000
				}
			},
			additionalProperties: false
		}
	}
});