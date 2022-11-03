// This file is automatically generated by `scripts/generate-validators`. Do not edit directly.

import createAPIValidator from 'lib/server/api/createAPIValidator';

export default createAPIValidator({
	$schema: 'http://json-schema.org/draft-07/schema#',
	$ref: '#/definitions/RequestMethod',
	definitions: {
		RequestMethod: {
			type: 'string',
			const: 'POST'
		}
	}
}, {
	$schema: 'http://json-schema.org/draft-07/schema#',
	$ref: '#/definitions/Request',
	definitions: {
		Request: {
			anyOf: [
				{
					type: 'object',
					additionalProperties: false,
					properties: {
						body: {
							type: 'object',
							properties: {
								pageIDs: {
									type: 'array',
									items: {
										$ref: '#/definitions/StoryPageID'
									},
									description: 'The initial IDs of pages to move. After being moved, the pages will be in the same order as in this array.',
									uniqueItems: true
								},
								position: {
									$ref: '#/definitions/integer',
									description: 'The position to insert the pages at.\n\nFor example, position 0 will insert the pages before page 1, position 1 will insert the pages after page 1, position 2 will insert the pages after page 2, and so on.',
									minimum: 0
								}
							},
							required: [
								'pageIDs',
								'position'
							],
							additionalProperties: false
						},
						query: {
							type: 'object',
							properties: {
								storyID: {
									type: 'string'
								}
							},
							required: [
								'storyID'
							],
							additionalProperties: false
						},
						method: {
							type: 'string',
							const: 'POST'
						}
					},
					required: [
						'body',
						'method',
						'query'
					]
				},
				{
					not: {}
				}
			]
		},
		StoryPageID: {
			$ref: '#/definitions/integer',
			minimum: 1
		},
		integer: {
			type: 'integer'
		}
	}
});