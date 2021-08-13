export type QuirkReplacement = {
	from: string,
	fromFlags: string,
	to: string
};

export type Quirk = {
	name: string,
	replacements: QuirkReplacement[]
};