import './styles.module.scss';
import { useFormikContext } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { TextareaHTMLAttributes, KeyboardEvent } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import { usePrefixedID } from 'modules/client/IDPrefix';
import { useIsomorphicLayoutEffect } from 'react-use';
import { uniq } from 'lodash';

/** A `textarea` used solely to calculate the `style.height` of a `TagField` based on its `rows` prop. */
const heightTextArea = document.createElement('textarea'); // @client-only

const invalidTagCharacters = /[^a-z0-9-,\s\n\u200c]/g;
const tagDelimiters = /[,\s\n]/g;

/** A child node of a tag field element. */
type TagFieldChild<NodeType extends ChildNode = ChildNode> = NodeType & (
	{
		/** Whether this element is a tag. */
		_tagFieldTag?: false,
		/** Whether this element is an editable. */
		_tagFieldEditable?: false
	} | (
		Element & {
			/** Whether this element is a tag. */
			_tagFieldTag: true,
			/** Whether this element is an editable. */
			_tagFieldEditable?: boolean
		}
	)
) & {
	textContent: string,
	previousSibling: TagFieldChild | null,
	nextSibling: TagFieldChild | null
};

const createTagFieldEditable = () => {
	const element = document.createElement('span') as TagFieldChild<HTMLSpanElement>;
	element._tagFieldTag = true;
	element._tagFieldEditable = true;
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
	const fieldValue = getFieldMeta<string | undefined>(name).value;

	const ref = useRef<HTMLDivElement & { childNodes: NodeListOf<TagFieldChild> }>(null!);

	const onChange = useCallback(() => {
		for (let i = 0; i < ref.current.childNodes.length; i++) {
			let child = ref.current.childNodes[i];

			if (!child._tagFieldEditable) {
				if (i === 0) {
					// If the first child is not an editable, insert an editable as the first child.

					const newChild = createTagFieldEditable();
					ref.current.insertBefore(newChild, child);
					child = newChild;
				} else if (!child._tagFieldTag) {
					// If this child is not an editable or a tag, convert it to an editable.

					const newChild = createTagFieldEditable();
					newChild.textContent = child.textContent;
					ref.current.replaceChild(newChild, child);
					child = newChild;
				}
			}

			if (child._tagFieldEditable) {
				// Merge all non-tags immediately following this editable into this editable.
				while (child.nextSibling && !child.nextSibling._tagFieldTag) {
					child.textContent += child.nextSibling.textContent;
					ref.current.removeChild(child.nextSibling);
				}

				// Remove all invalid tag characters from this editable.
				if (invalidTagCharacters.test(child.textContent)) {
					child.textContent = child.textContent.toLowerCase().replace(invalidTagCharacters, '');
				}

				if (tagDelimiters.test(child.textContent)) {
					let tagValues = child.textContent.split(tagDelimiters);

					// Set this editable's content to everything after the last tag delimiter.
					child.textContent = tagValues.pop()!;

					// Remove any redundant tag values.
					tagValues = uniq(tagValues);

					for (let j = 0; j < tagValues.length; j++) {
						const tagValue = tagValues[j];

						if (!tagValue) {
							continue;
						}

						if (!child.previousSibling?._tagFieldEditable) {
							// Ensure newly inserted tags have an editable before them.

							ref.current.insertBefore(createTagFieldEditable(), child);
						}

						// Create and insert the tag element before this editable.

						const tagContainer = document.createElement('div') as TagFieldChild<HTMLDivElement>;
						tagContainer._tagFieldTag = true;
						tagContainer.className = 'tag-field-tag-container';
						tagContainer.contentEditable = 'false';

						// When the cursor is immediately before a tag at the start of the tag field, this magically makes it so the cursor doesn't appear inside the tag.
						tagContainer.appendChild(document.createTextNode('\u200c'));

						const tag = document.createElement('div');
						tag.className = 'tag-field-tag';
						tag.textContent = tagValue;
						tagContainer.appendChild(tag);

						ref.current.insertBefore(tagContainer, child);
					}
				}
			}
		}
	}, []);

	const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key.length === 1 && !(
			event.ctrlKey
			|| event.metaKey
			|| event.altKey
			|| /^[a-z0-9-,\s]$/i.test(event.key)
		)) {
			// Don't let the user enter invalid characters for tags.
			event.preventDefault();
		} else {
			setTimeout(onChange);
		}
	}, [onChange]);

	const [height, setHeight] = useState(0);

	useIsomorphicLayoutEffect(() => {
		// Determine the element's height based on the `rows` prop.

		if (rows !== undefined) {
			heightTextArea.rows = rows;
		}
		ref.current.appendChild(heightTextArea);
		setHeight(heightTextArea.offsetHeight);
		ref.current.removeChild(heightTextArea);
	}, [rows]);

	return (
		<div
			id={id}
			className="tag-field input-like"
			contentEditable
			spellCheck={false}
			style={{
				height: `${height}px`
			}}
			onKeyDown={onKeyDown}
			onInput={onChange}
			onBlur={onChange}
			ref={ref}
			suppressContentEditableWarning
		/>
	);
};

export default TagField;