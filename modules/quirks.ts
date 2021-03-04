export type QuirkReplacement = {
	find: string | RegExp,
	replace: string
};

export type Quirk = {
	name: string,
	replacements: QuirkReplacement[]
};