import './styles.module.scss';
import type { ReactNode } from 'react';
import { useContext, useCallback } from 'react';
import { TextAreaRefContext } from 'components/BBToolbar';
import Button from 'components/Button';
import { Dialog } from 'modules/client/dialogs';
import type { BBTagProps } from 'components/BBCode/BBTags';

type Values = {
	children: string,
	attributes: BBTagProps['attributes']
};

const tags: Record<string, {
	/** The index of the tag within the BB toolbar icon sheet. */
	index: number,
	title: string,
	content?: ReactNode,
	initialValues?: (
		Values
		| ((
			/** The user's selected text in the text area's value. */
			selection: string
		) => Values)
	)
}> = {
	b: {
		index: 0,
		title: 'Bold'
	},
	i: {
		index: 1,
		title: 'Italic'
	},
	u: {
		index: 2,
		title: 'Underline'
	},
	s: {
		index: 3,
		title: 'Strikethrough'
	},
	color: {
		index: 4,
		title: 'Text Color'
	},
	background: {
		index: 5,
		title: 'Text Background Color'
	},
	size: {
		index: 6,
		title: 'Font Size'
	},
	font: {
		index: 7,
		title: 'Font Family'
	},
	left: {
		index: 8,
		title: 'Align Left'
	},
	center: {
		index: 9,
		title: 'Align Center'
	},
	right: {
		index: 10,
		title: 'Align Right'
	},
	justify: {
		index: 11,
		title: 'Align Justify'
	},
	url: {
		index: 12,
		title: 'Link'
	},
	alt: {
		index: 13,
		title: 'Hover Text'
	},
	img: {
		index: 14,
		title: 'Image'
	},
	spoiler: {
		index: 15,
		title: 'Spoiler'
	},
	flash: {
		index: 16,
		title: 'Flash Embed'
	}
};

export type BBToolbarButtonProps = {
	/** The name of the BBCode tag which the BB toolbar button creates. */
	tag: string
};

/** Gives the child text area a BBCode toolbar. */
const BBToolbarButton = ({ tag: tagName }: BBToolbarButtonProps) => {
	const tag = tags[tagName];

	const { textAreaRef, setValue } = useContext(TextAreaRefContext);

	return (
		<Button
			className="icon"
			title={tag.title}
			style={{
				backgroundPositionX: `${-tag.index}em`
			}}
			onClick={
				useCallback(async () => {
					const { selectionStart, selectionEnd } = textAreaRef.current;
					const selection = textAreaRef.current.value.slice(selectionStart, selectionEnd);

					let values: Values = {
						children: selection,
						attributes: undefined
					};

					if (tag.content) {
						const dialog = new Dialog<Values>({
							title: tag.title,
							content: tag.content,
							initialValues: Object.assign(
								values,
								tag.initialValues instanceof Function
									? tag.initialValues(selection)
									: tag.initialValues
							),
							actions: ['Okay', 'Cancel']
						});

						if (!await dialog) {
							return;
						}

						values = dialog.form!.values;
					}

					const openTag = `[${tagName}${
						values.attributes
							? typeof values.attributes === 'string'
								? `=${values.attributes}` // Perhaps this should be escaped to prevent "]" in `attributes` from closing the tag?
								: Object.entries(values.attributes).map(
									([name, value]) => ` ${name}=${value}`
								).join('')
							: ''
					}]`;
					const closeTag = `[/${tagName}]`;

					setValue(
						textAreaRef.current.value.slice(0, selectionStart)
						+ openTag
						+ values.children
						+ closeTag
						+ textAreaRef.current.value.slice(selectionEnd, textAreaRef.current.value.length)
					);

					// This timeout is necessary so the selection of the new value occurs after the new value renders.
					setTimeout(() => {
						textAreaRef.current.focus();
						textAreaRef.current.selectionStart = selectionStart + openTag.length;
						textAreaRef.current.selectionEnd = selectionStart + openTag.length + values.children.length;
					});

					// This ESLint comment is necessary because the rule incorrectly thinks `tagName` should be a dependency here, despite that it depends on `tag` which is already a dependency.
					// eslint-disable-next-line react-hooks/exhaustive-deps
				}, [tag, textAreaRef])
			}
		/>
	);
};

export default BBToolbarButton;