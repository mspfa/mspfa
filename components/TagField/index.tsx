import './styles.module.scss';
import { useFormikContext } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { TextareaHTMLAttributes, KeyboardEvent } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import { usePrefixedID } from 'modules/client/IDPrefix';
import { useIsomorphicLayoutEffect } from 'react-use';
import { uniq } from 'lodash';
import type { TagString } from 'modules/server/stories';

/** A `textarea` used solely to calculate the `style.height` of a `TagField` based on its `rows` prop. */
const heightTextArea = document.createElement('textarea'); // @client-only

/** Characters that should be replaced from the tag field before delimiters are processed. */
const invalidCharacters = /[^a-z0-9-,]/g;
const tagDelimiters = /[,\s\n]/g;

/** A child node of a tag field element. */
type TagFieldChild<NodeType extends ChildNode = ChildNode> = NodeType & (
	{
		// It's not really `undefined`, but `undefined` is the next best thing to `undefined | Exclude<string, 'tag-field-tag' | 'tag-field-editable'>`.
		className?: undefined
	} | (
		Element & {
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

export type TagFieldProps = Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'rows'> & {
	name: string
};

const TagField = ({ name, id, rows }: TagFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const { getFieldMeta, setFieldValue } = useFormikContext();
	const fieldValue = getFieldMeta<TagString[] | undefined>(name).value;
	const [initialValue] = useState(fieldValue);

	const ref = useRef<HTMLDivElement & {
		childNodes: NodeListOf<TagFieldChild>,
		firstChild: TagFieldChild | null,
		lastChild: TagFieldChild | null
	}>(null!);

	const createAndInsertTag = (tagValue: string, child: TagFieldChild) => {
		if (child.previousSibling?.className !== 'tag-field-editable') {
			// Ensure newly inserted tags have an editable before them.

			ref.current.insertBefore(createTagFieldEditable(), child);
		}

		// Create and insert the tag element before this editable.

		const tag = document.createElement('div') as TagFieldChild<HTMLDivElement>;
		tag.className = 'tag-field-tag';
		tag.contentEditable = 'false';

		const zwnj = document.createElement('span');
		zwnj.className = 'tag-field-zwnj';
		// When the cursor is immediately before a tag at the start of the tag field, this character (the zero-width non-joiner) magically makes it so the cursor doesn't appear inside the tag.
		zwnj.textContent = '\u200c';
		tag.appendChild(zwnj);

		const tagContent = document.createElement('div');
		tagContent.className = 'tag-field-tag-content';
		tagContent.textContent = tagValue;
		tag.appendChild(tagContent);

		ref.current.insertBefore(tag, child);
	};

	const onChange = useCallback(() => {
		for (let i = 0; i < ref.current.childNodes.length; i++) {
			let child = ref.current.childNodes[i];

			if (child.className !== 'tag-field-editable') {
				if (i === 0) {
					// If the first child is not an editable, insert an editable as the first child.

					const newChild = createTagFieldEditable();
					ref.current.insertBefore(newChild, child);
					child = newChild;
				} else if (child.className === 'tag-field-tag') {
					if (child.nextSibling?.className === 'tag-field-tag') {
						// If there are two adjacent tag elements, separate them with an editable.

						ref.current.insertBefore(createTagFieldEditable(), child.nextSibling);
					}
				} else {
					// If this child is not an editable or a tag, insert an editable before it so the child can be merged into it later.

					const newChild = createTagFieldEditable();
					ref.current.insertBefore(newChild, child);
					child = newChild;
				}
			}

			if (child.className === 'tag-field-editable') {
				// Merge all non-tags immediately following this editable into this editable.
				while (child.nextSibling && child.nextSibling.className !== 'tag-field-tag') {
					if (child.nextSibling.className === 'tag-field-editable' || child.nextSibling instanceof Text) {
						// Merge the following editable or text node into this editable.

						child.textContent += child.nextSibling.textContent;

						ref.current.removeChild(child.nextSibling);
					} else {
						// Add a comma so newly added non-editable elements are delimited as tags.
						child.textContent += ',';

						// `child.nextSibling` must be stored into `sibling` because `child.nextSibling` updates for each iteration of the below loop.
						const sibling = child.nextSibling;

						// Take the children out of the invalid sibling.
						while (sibling.firstChild) {
							ref.current.insertBefore(sibling.firstChild, sibling);
						}

						// Remove the emptied invalid sibling.
						ref.current.removeChild(sibling);
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
						const tagValue = tagValues[j].slice(0, 50);

						if (tagValue) {
							createAndInsertTag(tagValue, child);
						}
					}
				}
			}
		}
	}, []);

	const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
		// Don't let the user press `Enter`, because `Enter` has annoying functionality with `contentEditable`, and it is buggy in Firefox.
		if (event.key === 'Enter' || (
			event.key.length === 1 && !(
				event.ctrlKey
				|| event.metaKey
				|| event.altKey
				// Only let the user enter valid characters for tags.
				|| /^[a-z0-9-,]$/i.test(event.key)
			)
		)) {
			event.preventDefault();
		}

		setTimeout(onChange);
	}, [onChange]);

	useIsomorphicLayoutEffect(() => {
		// Determine the element's height based on the `rows` prop.

		if (rows !== undefined) {
			heightTextArea.rows = rows;
		}
		ref.current.appendChild(heightTextArea);

		// This height should not be managed via React state because the element is `resizable`, and any changed height could be reset by a re-render.
		ref.current.style.height = `${heightTextArea.offsetHeight}px`;

		ref.current.removeChild(heightTextArea);
	}, [rows]);

	useIsomorphicLayoutEffect(() => {
		// Add the tags from `initialValue`.

		// Reset the tag field, just in case.
		while (ref.current.firstChild) {
			ref.current.removeChild(ref.current.firstChild);
		}

		// Append an editable to insert the tags before.
		const child = createTagFieldEditable();
		ref.current.appendChild(child);

		if (initialValue) {
			for (const tagValue of initialValue) {
				createAndInsertTag(tagValue, child);
			}
		}
	}, [initialValue]);

	return (
		<div
			id={id}
			className="tag-field input-like"
			contentEditable
			spellCheck={false}
			onKeyDown={onKeyDown}
			onInput={onChange}
			ref={ref}
			suppressContentEditableWarning
		/>
	);
};

export default TagField;