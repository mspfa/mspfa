import './styles.module.scss';
import { useField } from 'formik';
import toKebabCase from 'lib/client/toKebabCase';
import type { TextareaHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import React, { useRef } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { usePrefixedID } from 'lib/client/reactContexts/IDPrefix';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import { isEqual } from 'lodash';
import storyTags, { TAG_OR_EXCLUDED_TAG } from 'lib/client/storyTags';
import type { TagOrExcludedTagString } from 'lib/client/storyTags';
import Label from 'components/Label';
import Dialog from 'components/Dialog';
import Link from 'components/Link';
import type { integer } from 'lib/types';
import classNames from 'classnames';

/** A `textarea` used solely to calculate the `style.height` of a `TagField` based on its `rows` prop. */
const heightTextArea = document.createElement('textarea'); // @client-only

/** Characters that should be replaced from the tag field before delimiters are processed. */
const INVALID_CHARACTERS = /[^a-z0-9-,#\s\n]/g;
/** Matches a character which would not be matched by `INVALID_CHARACTERS`. */
const VALID_CHARACTER = /^[a-z0-9-,#\s\n]$/i;
const TAG_DELIMITERS = /[,#\s\n]/g;
const START_HYPHENS = /^-+/;
const END_HYPHENS = /-+$/;

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
	const editable = document.createElement('span') as TagFieldChild<HTMLSpanElement>;
	editable.className = 'tag-field-editable';
	return editable;
};

export type TagFieldProps = Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'name' | 'rows'> & {
	/** The maximum number of tags allowed. Defaults to 50. */
	max?: integer,
	label?: ReactNode,
	help?: ReactNode,
	/** Allows tags prefixed with a hyphen as valid tag values. */
	allowExcludedTags?: boolean
};

const TagField = ({
	name = 'tags',
	id,
	allowExcludedTags,
	label = 'Tags',
	help = (
		allowExcludedTags
			? 'An adventure that has all of these tags will be included in the search results (given it also matches other search parameters).\n\nPrefix a tag with a hyphen (e.g. "-test") to set it as an excluded tag. An adventure that has any of the excluded tags will be excluded from the search results, even if it matches other search parameters.'
			: 'Tags are keywords that help identify and describe an adventure.\n\nUsers can search for adventures with certain tags, and they can see an adventure\'s tags before opening it to get an idea of what kind of adventure it is.'
	),
	max = 50,
	rows = 3
}: TagFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const [, { value }, { setValue }] = useField<TagOrExcludedTagString[]>(name);

	const inputRef = useRef<HTMLDivElement & {
		childNodes: NodeListOf<TagFieldChild>,
		firstChild: TagFieldChild | null,
		lastChild: TagFieldChild | null
	}>(null as never);

	/** Inserts a tag element before the specified `TagFieldChild`. Automatically adds an editable before (but not after) the new tag if necessary. */
	const createAndInsertTag = (
		tagValue: string,
		/** The element to insert the tag before. */
		child: TagFieldChild
	) => {
		// Ensure newly inserted tags have an editable before them.
		if (child.previousSibling?.className !== 'tag-field-editable') {
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

	/** Updates the form value of the field based on the contents of the field's input, and normalizes the contents of the field's input. */
	const updateTagField = useFunction(() => {
		const allTagValues: TagOrExcludedTagString[] = [];

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
						// Check if this tag's value is malformed.
						|| !TAG_OR_EXCLUDED_TAG.test(tagValue)
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
				if (INVALID_CHARACTERS.test(child.textContent)) {
					child.textContent = child.textContent.toLowerCase().replace(INVALID_CHARACTERS, '');
				}

				if (TAG_DELIMITERS.test(child.textContent)) {
					const tagValues = child.textContent.split(TAG_DELIMITERS);

					// Set this editable's content to everything after the last tag delimiter.
					child.textContent = tagValues.pop()!;

					for (let j = 0; j < tagValues.length; j++) {
						const tagValue = (
							tagValues[j]
								.replace(START_HYPHENS, allowExcludedTags ? '-' : '')
								.slice(0, 50)
								.replace(END_HYPHENS, '')
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
			// Hide the comma if there's nothing after it.
			(lastTag.lastChild as HTMLElement).hidden = !inputRef.current.lastChild!.textContent;
		}

		if (!isEqual(value, allTagValues)) {
			setValue(allTagValues);
		}
	});

	// Determine the element's height based on the `rows` prop. This is necessary because the input element is a `contentEditable` `div`, not a real `textarea` with a `rows` attribute.
	// This is a layout effect hook so the field does not briefly appear to be the wrong size on the first render.
	useIsomorphicLayoutEffect(() => {
		heightTextArea.rows = rows;
		inputRef.current.appendChild(heightTextArea);

		// This height should not be managed via React state because the element is `resizable`, and any changed height could be reset by a re-render.
		inputRef.current.style.height = `${heightTextArea.offsetHeight}px`;

		inputRef.current.removeChild(heightTextArea);
	}, [rows]);

	// Update the field input's contents when its form value changes.
	// This is a layout effect hook so the field does not briefly appear to be empty on the first render.
	useIsomorphicLayoutEffect(() => {
		if (inputRef.current.childNodes.length === 0) {
			inputRef.current.appendChild(createTagFieldEditable());
		}

		const formTagValues = [...value];
		let formTagValue;

		tagLoop:
		for (const tag of (
			// It is necessary to spread this `HTMLCollection` into an array, or else the indexes of elements in the `HTMLCollection`'s iterator would shift around due to inserted or removed elements during iteration.
			[...inputRef.current.getElementsByClassName('tag-field-tag')] as Array<TagFieldChild<HTMLDivElement>>
		)) {
			if (formTagValues.length) {
				// Add any tags from the form value which are before this tag from the input value.

				const inputTagValue = tag.getElementsByClassName('tag-field-tag-content')[0].textContent!;
				while (formTagValue = formTagValues.shift()) {
					if (formTagValue === inputTagValue) {
						// This tag from the input value has been found in the form value, so don't remove it, and continue.
						continue tagLoop;
					}

					createAndInsertTag(formTagValue, tag.previousSibling!);
				}
			}

			// Remove this tag from the input value, since it doesn't appear in the same place in the form value.

			// Merge the editables around the tag element.
			tag.nextSibling!.textContent = tag.previousSibling!.textContent + tag.nextSibling!.textContent;
			inputRef.current.removeChild(tag.previousSibling!);

			// Remove the tag element.
			inputRef.current.removeChild(tag);
		}

		// Add any tags from the form value which weren't in the input value.
		for (const formTagValue of formTagValues) {
			createAndInsertTag(formTagValue, inputRef.current.lastChild!);
		}
	}, [value]);

	return (
		<div className="tag-field">
			<Label
				block
				help={help}
			>
				{label}
			</Label>
			<div
				id={id}
				className="tag-field-input input-like"
				contentEditable
				spellCheck={false}
				onInput={updateTagField}
				onKeyDown={
					useFunction((event: KeyboardEvent<HTMLDivElement>) => {
						// Ignore tabs, leaving the browser to handle them.
						if (event.code === 'Tab') {
							return;
						}

						// Don't let the user press `Enter`, because `Enter` has annoying functionality with `contentEditable`, and it is buggy in Firefox.
						if (event.code === 'Enter' || (
							event.key.length === 1 && !(
								// Don't prevent keyboard shortcuts.
								event.ctrlKey
								|| event.metaKey
								|| event.altKey
								// Only let the user enter valid characters for tags.
								|| VALID_CHARACTER.test(event.key)
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
							let tag;
							if (event.target.classList.contains('tag-field-tag-preset')) {
								tag = event.target;
							} else if (event.target.parentNode.classList.contains('tag-field-tag-preset')) {
								tag = event.target.parentNode;
							} else {
								return;
							}

							const tagValue = tag.dataset.value;

							if (!(tagValue && storyTags[tagValue])) {
								return;
							}

							if (event.target.classList.contains('tag-field-tag-help')) {
								Dialog.create(
									<Dialog id="help" title={`Help: #${tagValue}`}>
										Use this tag if:<br />
										<br />
										{storyTags[tagValue]}
									</Dialog>
								);
								return;
							}

							if (value.includes(tagValue)) {
								return;
							}

							setValue([
								...value
									// If the user clicked `test`, they probably don't want `-test` to stay.
									.filter(previousTagValue => previousTagValue !== `-${tagValue}`),
								tagValue
							]);
						})
					}
				>
					{Object.keys(storyTags).map(tagValue => (
						<div
							key={tagValue}
							className={classNames('tag-field-tag-preset', { used: value.includes(tagValue) })}
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
