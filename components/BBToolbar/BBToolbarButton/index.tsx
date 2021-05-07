import './styles.module.scss';
import { useContext, useCallback } from 'react';
import { TextAreaRefContext } from 'components/BBToolbar';
import Button from 'components/Button';
import { Dialog } from 'modules/client/dialogs';
import type { BBTagProps } from 'components/BBCode/BBTags';
import LabeledDialogBox from 'components/Box/LabeledDialogBox';
import FieldBoxRow from 'components/Box/FieldBoxRow';

type NewBBTagProps = {
	children: string,
	attributes: BBTagProps['attributes']
};

const tags: Record<string, {
	title: string,
	initialValues?: (
		Record<string, any>
		| ((
			/** The user's selected text in the text area. */
			children: string
		) => Record<string, any>)
	),
	content?: Dialog<Record<string, any>>['content'],
	valuesToProps?: <Values extends Record<string, any>>(
		values: Values
	) => Partial<NewBBTagProps>
}> = {
	b: {
		title: 'Bold'
	},
	i: {
		title: 'Italic'
	},
	u: {
		title: 'Underline'
	},
	s: {
		title: 'Strikethrough'
	},
	color: {
		title: 'Text Color'
	},
	background: {
		title: 'Text Background Color'
	},
	size: {
		title: 'Font Size'
	},
	font: {
		title: 'Font Family'
	},
	left: {
		title: 'Align Left'
	},
	center: {
		title: 'Align Center'
	},
	right: {
		title: 'Align Right'
	},
	justify: {
		title: 'Align Justify'
	},
	url: {
		title: 'Link'
	},
	alt: {
		title: 'Hover Text',
		content: (
			<LabeledDialogBox>
				<FieldBoxRow name="hoverText" label="Hover Text" autoFocus required />
				<FieldBoxRow name="children" label="Content" />
			</LabeledDialogBox>
		),
		valuesToProps: ({ hoverText, children }) => ({
			attributes: hoverText,
			children
		})
	},
	img: {
		title: 'Image'
	},
	spoiler: {
		title: 'Spoiler'
	},
	flash: {
		title: 'Flash Embed'
	}
};

// The above `tags` must be in the same order as the BB toolbar icon sheet.

/** The indexes of each tag within the BB toolbar icon sheet. */
const tagIndexes = Object.fromEntries(
	Object.keys(tags).map(
		(tagName, i) => [tagName, i]
	)
);

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
				backgroundPositionX: `${-tagIndexes[tagName]}em`
			}}
			onClick={
				useCallback(async () => {
					const { selectionStart, selectionEnd } = textAreaRef.current;
					const selection = textAreaRef.current.value.slice(selectionStart, selectionEnd);

					const tagProps: NewBBTagProps = {
						children: selection,
						attributes: undefined
					};

					if (tag.content) {
						const dialog = new Dialog({
							title: tag.title,
							content: tag.content,
							initialValues: {
								children: selection,
								...tag.initialValues instanceof Function
									? tag.initialValues(selection)
									: tag.initialValues
							},
							actions: [
								{ label: 'Okay', autoFocus: false },
								'Cancel'
							]
						});

						if (!(await dialog)?.submit) {
							return;
						}

						if (tag.valuesToProps) {
							Object.assign(tagProps, tag.valuesToProps(dialog.form!.values));
						}
					}

					const openTag = `[${tagName}${
						tagProps.attributes
							? typeof tagProps.attributes === 'string'
								? `=${tagProps.attributes}` // Perhaps this should be escaped to prevent "]" in `attributes` from closing the tag?
								: Object.entries(tagProps.attributes).map(
									([name, value]) => ` ${name}=${value}`
								).join('')
							: ''
					}]`;
					const closeTag = `[/${tagName}]`;

					setValue(
						textAreaRef.current.value.slice(0, selectionStart)
						+ openTag
						+ tagProps.children
						+ closeTag
						+ textAreaRef.current.value.slice(selectionEnd, textAreaRef.current.value.length)
					);

					// This timeout is necessary so the selection of the new value occurs after the new value renders.
					setTimeout(() => {
						textAreaRef.current.focus();
						textAreaRef.current.selectionStart = selectionStart + openTag.length;
						textAreaRef.current.selectionEnd = selectionStart + openTag.length + tagProps.children.length;
					});

					// This ESLint comment is necessary because the rule incorrectly thinks `tagName` should be a dependency here, despite that it depends on `tag` which is already a dependency.
					// eslint-disable-next-line react-hooks/exhaustive-deps
				}, [tag, textAreaRef])
			}
		/>
	);
};

export default BBToolbarButton;