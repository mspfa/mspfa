import './styles.module.scss';
import { useFormikContext } from 'formik';
import toKebabCase from 'lib/client/toKebabCase';
import type { TextareaHTMLAttributes, KeyboardEvent, MouseEvent } from 'react';
import React, { useRef, useState } from 'react';
import useFunction from 'lib/client/useFunction';
import { usePrefixedID } from 'lib/client/IDPrefix';
import { useIsomorphicLayoutEffect } from 'react-use';
import { isEqual, uniq } from 'lodash';
import type { TagString } from 'lib/server/stories';
import Label from 'components/Label';
import Dialog from 'lib/client/Dialog';
import Link from 'components/Link';
import type { integer } from 'lib/types';

/** An object that maps `TagString`s to `string`s explaining each tag. */
const tagHelp: Partial<Record<TagString, string>> = {
	nonmspa: 'This adventure is unrelated to MSPA.',
	test: 'This adventure was only made to test something.',
	translation: 'This adventure only serves as a translation of something else.',
	sburb: 'This adventure focuses on Sburb.',
	puzzle: 'This adventure focuses on problems and puzzles.',
	suggestion: 'This adventure depends mainly on suggestions from readers.',
	mirror: 'This adventure is authored by someone else and was not intended for MSPFA.',
	alternate: 'This adventure is an alternate version of a different story.',
	shitpost: 'This adventure is intended to look like a low-quality joke.',
	nsfw: 'This adventure is for 18+ readers only and should be blocked from underage readers.'
};

/** A `textarea` used solely to calculate the `style.height` of a `TagField` based on its `rows` prop. */
const heightTextArea = document.createElement('textarea'); // @client-only

/** Characters that should be replaced from the tag field before delimiters are processed. */
const invalidCharacters = /[^a-z0-9-,#\s\n]/g;
/** Matches a character which would not be matched by `invalidCharacters`. */
const validCharacter = /^[a-z0-9-,#\s\n]$/i;
const tagDelimiters = /[,#\s\n]/g;
const startAndEndHyphens = /^-+|-+$/g;

/** A child node of a tag field element. */
type TagFieldChild<NodeType extends Node = Node> = NodeType & (
	{
		// It's not really `undefined`, but `undefined` is the next best thing to `undefined | Exclude<string, 'tag-field-tag' | 'tag-field-editable'>`.
		className?: undefined
	} | (
		HTMLElement & {
			className: 'tag-field-tag' | 'tag-field-editable'
		}
	)
) & {
	textContent: string,
	previousSibling: TagFieldChild | null,
	nextSibling: TagFieldChild | null
};

const createTagFieldEditable = () => {
	const element = document.createElement('span') as TagFieldChild<HTMLSpanElement>;
	element.className = 'tag-field-editable';
	return element;
};

export type TagFieldProps = Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'id' | 'rows'> & {
	/** The maximum number of tags allowed. Defaults to 50. */
	max?: integer
};

const TagField = ({
	name = 'tags',
	id,
	max = 50,
	rows
}: TagFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const { getFieldMeta, setFieldValue } = useFormikContext();
	const fieldValue = getFieldMeta<TagString[]>(name).value;
	const [initialValue] = useState(fieldValue);

	const inputRef = useRef<HTMLDivElement & {
		childNodes: NodeListOf<TagFieldChild>,
		firstChild: TagFieldChild | null,
		lastChild: TagFieldChild | null
	}>(null!);

	const createAndInsertTag = (tagValue: string, child: TagFieldChild) => {
		if (child.previousSibling?.className !== 'tag-field-editable') {
			// Ensure newly inserted tags have an editable before them.

			inputRef.current.insertBefore(createTagFieldEditable(), child);
		}

		// Create and insert the tag element before this editable.

		const tag = document.createElement('div') as TagFieldChild<HTMLDivElement>;
		tag.className = 'tag-field-tag';
		tag.contentEditable = 'false';

		const tagDelimiter = document.createElement('span');
		tagDelimiter.className = 'tag-field-tag-delimiter';
		// This is necessary to add commas to tags when copying or dragging tags from a selection in the tag field.
		// `\u00a0` is a non-breaking space and is necessary to prevent HTML omitting spaces from the selection.
		tagDelimiter.textContent = ',\u00a0';
		tag.appendChild(tagDelimiter);

		const zwnj = document.createElement('span');
		zwnj.className = 'tag-field-zwnj';
		// When the cursor is immediately before a tag at the start of the tag field, this character (the zero-width non-joiner) magically makes it so the cursor doesn't appear inside the tag.
		zwnj.textContent = '\u200c';
		tag.appendChild(zwnj);

		const tagContent = document.createElement('div');
		tagContent.className = 'tag-field-tag-content';
		tagContent.textContent = tagValue;
		tag.appendChild(tagContent);

		const tagAction = document.createElement('button');
		tagAction.className = 'link tag-field-tag-action tag-field-tag-remove';
		tagAction.title = 'Remove';
		tag.appendChild(tagAction);

		tag.appendChild(tagDelimiter.cloneNode(true));

		inputRef.current.insertBefore(tag, child);

		return tag;
	};

	const updateTagField = useFunction(() => {
		const allTagValues: TagString[] = [];

		for (let i = 0; i < inputRef.current.childNodes.length; i++) {
			let child = inputRef.current.childNodes[i];

			if (child.className !== 'tag-field-editable') {
				if (i === 0) {
					// If the first child is not an editable, insert an editable as the first child.

					const newChild = createTagFieldEditable();
					inputRef.current.insertBefore(newChild, child);
					child = newChild;
				} else if (child.className === 'tag-field-tag') {
					const tagValue = child.getElementsByClassName('tag-field-tag-content')[0].textContent!;

					// Check for and remove invalid tags.
					if (
						// Check if this tag is a duplicate.
						allTagValues.includes(tagValue)
						// Check if this tag exceeds the max tag count.
						|| allTagValues.length >= max
					) {
						// Remove the invalid tag.
						inputRef.current.removeChild(child);

						// Go two iterations back. One to redo this iteration since its child was removed, and another to redo the iteration of the element before the removed child (since changing its `nextSibling` may have an effect on it).
						i -= 2;
						continue;
					}

					allTagValues.push(tagValue);

					// Replace the tag with a newly created copy in case the old one got messed up.

					const newChild = createAndInsertTag(tagValue, child);
					inputRef.current.removeChild(child);
					child = newChild;

					if (child.nextSibling?.className === 'tag-field-tag') {
						// If there are two adjacent tag elements, separate them with an editable.

						inputRef.current.insertBefore(createTagFieldEditable(), child.nextSibling);
					}
				} else {
					// If this child is not an editable or a tag, insert an editable before it so this child can be merged into it later.

					const newChild = createTagFieldEditable();
					inputRef.current.insertBefore(newChild, child);
					child = newChild;
				}
			}

			if (child.className === 'tag-field-editable') {
				// Merge all non-tags immediately following this editable into this editable.
				while (child.nextSibling && child.nextSibling.className !== 'tag-field-tag') {
					if (child.nextSibling.className === 'tag-field-editable' || child.nextSibling instanceof Text) {
						// Merge the following editable or text node into this editable.

						child.textContent += child.nextSibling.textContent;

						inputRef.current.removeChild(child.nextSibling);
					} else {
						// Add a comma so newly added non-editable elements are delimited as tags.
						child.textContent += ',';

						// `child.nextSibling` must be stored into `sibling` because `child.nextSibling` updates for each iteration of the below loop.
						const sibling = child.nextSibling;

						// Take the children out of the invalid sibling.
						while (sibling.firstChild) {
							inputRef.current.insertBefore(sibling.firstChild, sibling);
						}

						// Remove the emptied invalid sibling.
						inputRef.current.removeChild(sibling);
					}
				}

				// Ensure this editable has valid children.
				if (child.childNodes.length && (
					child.childNodes.length > 1
					|| !(child.firstChild instanceof Text)
				)) {
					child.textContent = child.textContent;
				}

				// Remove all invalid characters from this editable before delimiters are processed.
				if (invalidCharacters.test(child.textContent)) {
					child.textContent = child.textContent.toLowerCase().replace(invalidCharacters, '');
				}

				if (tagDelimiters.test(child.textContent)) {
					let tagValues = child.textContent.split(tagDelimiters);

					// Set this editable's content to everything after the last tag delimiter.
					child.textContent = tagValues.pop()!;

					// Remove any redundant tag values.
					tagValues = uniq(tagValues);

					for (let j = 0; j < tagValues.length; j++) {
						const tagValue = (
							tagValues[j]
								.replace(startAndEndHyphens, '')
								.slice(0, 50)
								.replace(startAndEndHyphens, '')
						);

						if (tagValue && !allTagValues.includes(tagValue)) {
							// Insert the new tag. New tag elements will be checked in following iterations.
							createAndInsertTag(tagValue, child);
						}
					}
				}
			}
		}

		if (inputRef.current.lastChild?.className !== 'tag-field-editable') {
			inputRef.current.appendChild(createTagFieldEditable());
		}

		const lastTag = inputRef.current.lastChild!.previousSibling as (
			(TagFieldChild & { className: 'tag-field-tag' })
			| null
		);

		if (lastTag) {
			(lastTag.lastChild as HTMLElement).classList[
				inputRef.current.lastChild!.textContent
					? 'remove'
					// Hide the comma if there's nothing after it.
					: 'add'
			]('force-hidden');
		}

		if (!isEqual(fieldValue, allTagValues)) {
			setFieldValue(name, allTagValues);
		}
	});

	useIsomorphicLayoutEffect(() => {
		// Determine the element's height based on the `rows` prop.

		if (rows !== undefined) {
			heightTextArea.rows = rows;
		}
		inputRef.current.appendChild(heightTextArea);

		// This height should not be managed via React state because the element is `resizable`, and any changed height could be reset by a re-render.
		inputRef.current.style.height = `${heightTextArea.offsetHeight}px`;

		inputRef.current.removeChild(heightTextArea);
	}, [rows]);

	useIsomorphicLayoutEffect(() => {
		// Add the tags from `initialValue`.

		// Reset the tag field, just in case.
		while (inputRef.current.firstChild) {
			inputRef.current.removeChild(inputRef.current.firstChild);
		}

		// Append an editable to insert the tags before.
		const child = createTagFieldEditable();
		inputRef.current.appendChild(child);

		for (const tagValue of initialValue) {
			createAndInsertTag(tagValue, child);
		}
	}, [initialValue]);

	return (
		<div className="tag-field">
			<Label
				block
				help={'Tags are keywords that help identify and describe an adventure.\n\nUsers can search for adventures with certain tags, and they can read an adventure\'s tags to get an idea of what kind of adventure it is before opening it.'}
			>
				Tags
			</Label>
			<div
				id={id}
				className="tag-field-input input-like"
				contentEditable
				spellCheck={false}
				onInput={updateTagField}
				onKeyDown={
					useFunction((event: KeyboardEvent<HTMLDivElement>) => {
						// Don't let the user press `Enter`, because `Enter` has annoying functionality with `contentEditable`, and it is buggy in Firefox.
						if (event.code === 'Enter' || (
							event.key.length === 1 && !(
								event.ctrlKey
								|| event.metaKey
								|| event.altKey
								// Only let the user enter valid characters for tags.
								|| validCharacter.test(event.key)
							)
						)) {
							event.preventDefault();
						}

						setTimeout(updateTagField);
					})
				}
				onClick={
					useFunction((event: MouseEvent<HTMLDivElement> & { target: HTMLElement }) => {
						if (event.target.classList.contains('tag-field-tag-remove')) {
							inputRef.current.removeChild(event.target.parentNode!);

							updateTagField();
						}
					})
				}
				ref={inputRef}
			/>
			<div className="tag-field-presets-container">
				<Label>Preset Tags (click a tag to add it)</Label>
				<div
					className="tag-field-presets input-like"
					onClick={
						useFunction((
							event: MouseEvent<HTMLDivElement> & {
								target: HTMLElement & { parentNode: HTMLElement }
							}
						) => {
							const tag = (
								event.target.classList.contains('tag-field-tag-preset')
									? event.target
									: event.target.parentNode.classList.contains('tag-field-tag-preset')
										? event.target.parentNode
										: undefined
							);

							if (!tag) {
								return;
							}

							const tagValue = tag.dataset.value;

							if (!(tagValue && tagHelp[tagValue])) {
								return;
							}

							if (event.target.classList.contains('tag-field-tag-help')) {
								new Dialog({
									id: 'help',
									title: `Help: #${tagValue}`,
									content: `Use this tag if:\n\n${tagHelp[tagValue]}`
								});
							} else if (!fieldValue.includes(tagValue)) {
								createAndInsertTag(tagValue, inputRef.current.lastChild!);
								setFieldValue(name, [...fieldValue, tagValue]);
							}
						})
					}
				>
					{Object.keys(tagHelp).map(tagValue => (
						<div
							key={tagValue}
							className={`tag-field-tag-preset${fieldValue.includes(tagValue) ? ' added' : ''}`}
							data-value={tagValue}
						>
							<div className="tag-field-tag-content">
								{tagValue}
							</div>
							<Link
								className="tag-field-tag-action tag-field-tag-help"
								title="Help"
							/>
							<span className="tag-field-tag-delimiter">
								&nbsp;
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default TagField;