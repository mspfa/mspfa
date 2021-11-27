/**
 * @minLength 1
 * @maxLength 50
 * @pattern ^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$
 */
export type TagString = string;

/**
 * @minLength 1
 * @maxLength 51
 * @pattern ^-?[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$
 */
export type TagOrExcludedTagString = string;

export const tagOrExcludedTagTest = /^-?[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

/** A record of story tags which maps each `TagString` to a `string` explaining the tag. */
const storyTags: Partial<Record<TagString, string>> = {
	nonmspa: 'This adventure is unrelated to MSPA.',
	test: 'This adventure was only made to test something.',
	translation: 'This adventure only serves as a translation of something else.',
	sburb: 'This adventure focuses on Sburb.',
	puzzle: 'This adventure focuses on problems and puzzles.',
	suggestion: 'This adventure depends mainly on suggestions from readers.',
	mirror: 'This adventure is authored by someone else and was not intended for MSPFA.',
	alternate: 'This adventure is an alternate version of a different story.',
	branching: 'A prominent aspect of this adventure is that it has multiple story paths.',
	shitpost: 'This adventure is intended to look like a low-quality joke.',
	nsfw: 'This adventure is for 18+ readers only, should be blocked from underage readers, and is unlisted to anyone not signed in.'
};

export default storyTags;