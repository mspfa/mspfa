/**
 * Converts any string to kebab case.
 *
 * Example:
 * ```
 * toKebabCase('THEQuick... brown.foxJumps!') === 't-h-e-quick-brown-fox-jumps'
 * ```
 */
const toKebabCase = (string: string) => (
	string
		.replace(/([A-Z])/g, '-$1')
		.replace(/\W/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase()
);

export default toKebabCase;