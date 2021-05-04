export type QuirkReplacement = {
	from: string | RegExp,
	to: string
};

export type Quirk = {
	name: string,
	replacements: QuirkReplacement[]
};