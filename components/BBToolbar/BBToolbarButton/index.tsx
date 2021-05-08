import './styles.module.scss';
import { useContext, useCallback } from 'react';
import { TextAreaRefContext } from 'components/BBToolbar';
import Button from 'components/Button';
import { Dialog } from 'modules/client/dialogs';
import type { BBTagProps } from 'components/BBCode/BBTags';
import LabeledDialogBox from 'components/Box/LabeledDialogBox';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import Label from 'components/Label';
import { Field } from 'formik';
import BoxRow from 'components/Box/BoxRow';

const bbPreview = 'The quick brown fox jumps over the lazy dog.';

const randomColorAttributes = () => ({
	attributes: `#${`00000${Math.floor(Math.random() * 0x1000000).toString(16)}`.slice(-6)}`
});

const presetFontFamilies = ['Arial', 'Bodoni MT', 'Book Antiqua', 'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Courier New', 'Garamond', 'Georgia', 'Goudy Old Style', 'Helvetica', 'Homestuck-Regular', 'Impact', 'Lucida Bright', 'Lucida Console', 'Lucida Sans Typewriter', 'Perpetua', 'Rockwell', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];

type NewBBTagProps = {
	/** The content of the BB tag. */
	children: string,
	attributes: BBTagProps['attributes']
};

const tags: Record<string, {
	title: string,
	/**
	 * The initial values of the BB tag's dialog form.
	 *
	 * These values are spread to `{ children, attributes: '' }` when setting the dialog form's initial values.
	 *
	 * If this is a function, the return value is spread to the initial values instead.
	 */
	initialValues?: (
		Record<string, any>
		| ((
			/** The user's selected text in the text area. */
			children: string
		) => Record<string, any>)
	),
	/**
	 * The content of the BB tag dialog which opens when the tag's icon is clicked in the toolbar.
	 *
	 * If `undefined`, no dialog will open when this tag's icon is clicked.
	 */
	content?: Dialog<Record<string, any>>['content'],
	/**
	 * A function called when the BB tag's dialog closes.
	 *
	 * The dialog form's values are passed in, and the return value is spread with the form's values and the current selected `children` to the BB tag's props.
	 */
	valuesToProps?: <Values extends Record<string, any>>(
		values: Values
	) => Partial<NewBBTagProps>,
	/** After inserting the tag into the text area, whether to set the selection to after the tag rather than selecting its children. */
	selectAfter?: boolean
}> = {
	b: { title: 'Bold' },
	i: { title: 'Italic' },
	u: { title: 'Underline' },
	s: { title: 'Strikethrough' },
	color: {
		title: 'Text Color',
		initialValues: randomColorAttributes,
		content: (
			<LabeledDialogBox>
				<FieldBoxRow
					type="color"
					name="attributes"
					label="Color"
					required
					autoFocus
				/>
			</LabeledDialogBox>
		)
	},
	background: {
		title: 'Text Background Color',
		initialValues: randomColorAttributes,
		content: (
			<LabeledDialogBox>
				<FieldBoxRow
					type="color"
					name="attributes"
					label="Color"
					required
					autoFocus
				/>
			</LabeledDialogBox>
		)
	},
	size: {
		title: 'Font Size',
		initialValues: { bbPreview },
		content: ({ values }) => (
			<LabeledDialogBox>
				<FieldBoxRow
					type="number"
					name="attributes"
					label="Percent Size"
					required
					autoFocus
					min={0}
				/>
				<BoxRow>
					<Label htmlFor="field-bb-preview">
						Preview
					</Label>
					{/* This `.bbcode` container is necessary to give the preview text the correct relative font size. */}
					<span className="bbcode">
						<Field
							as="textarea"
							id="field-bb-preview"
							name="bbPreview"
							rows={3}
							style={(
								typeof values.attributes === 'number'
									? { fontSize: `${values.attributes}%` }
									: undefined
							)}
						/>
					</span>
				</BoxRow>
			</LabeledDialogBox>
		)
	},
	font: {
		title: 'Font Family',
		initialValues: { bbPreview },
		content: ({ values }) => (
			<>
				<LabeledDialogBox>
					<FieldBoxRow
						as="select"
						name="attributes"
						label="Preset Font"
						required
						autoFocus
					>
						<option
							value={presetFontFamilies.includes(values.attributes) ? '' : values.attributes}
							disabled
							hidden
						/>
						{presetFontFamilies.map(fontFamily => (
							<option
								key={fontFamily}
								value={fontFamily}
								style={{ fontFamily }}
							>
								{fontFamily}
							</option>
						))}
					</FieldBoxRow>
					<FieldBoxRow
						name="attributes"
						label="Alternate Font"
						required
					/>
					<BoxRow>
						<Label htmlFor="field-bb-preview">
							Preview
						</Label>
						<Field
							as="textarea"
							id="field-bb-preview"
							name="bbPreview"
							rows={3}
							style={{ fontFamily: values.attributes }}
						/>
					</BoxRow>
				</LabeledDialogBox>
			</>
		)
	},
	left: { title: 'Align Left' },
	center: { title: 'Align Center' },
	right: { title: 'Align Right' },
	justify: { title: 'Align Justify' },
	url: {
		title: 'Link',
		initialValues: children => ({
			attributes: '',
			children: '',
			[children.includes('://') ? 'attributes' : 'children']: children
		}),
		content: ({ initialValues }) => (
			<LabeledDialogBox>
				<FieldBoxRow
					type="url"
					name="attributes"
					label="URL"
					required
					autoFocus={!initialValues.attributes}
				/>
				<FieldBoxRow
					as="textarea"
					name="children"
					label="Link Text"
					placeholder="Optional"
					autoFocus={!!initialValues.attributes}
				/>
			</LabeledDialogBox>
		),
		valuesToProps: ({ attributes, children }) => {
			const childrenIsURL = !children || attributes === children;

			return {
				attributes: childrenIsURL ? undefined : attributes,
				children: childrenIsURL ? attributes : children
			};
		}
	},
	alt: {
		title: 'Hover Text',
		content: (
			<LabeledDialogBox>
				<FieldBoxRow
					name="attributes"
					label="Hover Text"
					required
					autoFocus
				/>
			</LabeledDialogBox>
		)
	},
	img: {
		title: 'Image',
		initialValues: {
			width: '',
			height: ''
		},
		content: (
			<LabeledDialogBox>
				<FieldBoxRow
					type="url"
					name="children"
					label="Image URL"
					required
					autoFocus
					help="TODO: Add info on getting image URLs."
				/>
				<FieldBoxRow
					type="number"
					name="width"
					label="Width"
					placeholder="Optional"
					min={0}
				/>
				<FieldBoxRow
					type="number"
					name="height"
					label="Height"
					placeholder="Optional"
					min={0}
				/>
			</LabeledDialogBox>
		),
		valuesToProps: ({ width, height, children }) => ({
			children,
			attributes: (
				(width ? width : '')
				+ (height ? `x${height}` : '')
			)
		}),
		selectAfter: true
	},
	spoiler: {
		title: 'Spoiler',
		initialValues: {
			open: '',
			close: ''
		},
		content: (
			<LabeledDialogBox>
				<FieldBoxRow
					name="open"
					label={'"Show" Button Text'}
					autoFocus
					placeholder="Optional"
				/>
				<FieldBoxRow
					name="close"
					label={'"Hide" Button Text'}
					placeholder="Optional"
				/>
			</LabeledDialogBox>
		),
		valuesToProps: ({ open, close }) => ({
			attributes: (
				open || close
					? {
						...!!open && { open },
						...!!close && { close }
					}
					: undefined
			)
		})
	},
	chat: { title: 'Chat' }
};

// The above `tags` must be in the same order as the BB toolbar icon sheet.

/** The indexes of each tag within the BB toolbar icon sheet. */
const tagIndexes = Object.fromEntries(
	Object.keys(tags).map(
		(tagName, i) => [tagName, i]
	)
);

export type BBToolbarButtonProps = {
	/** The name of the BB tag which the BB toolbar button creates. */
	tag: string
};

/** Adds a BBCode toolbar to the child text area. */
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
					let children = textAreaRef.current.value.slice(
						textAreaRef.current.selectionStart,
						textAreaRef.current.selectionEnd
					);

					const tagProps: NewBBTagProps = {
						children,
						// This needs to initially be an empty string and not `undefined` so that the form's initial values include this property, and any fields with `name="attributes"` are initially Formik-controlled.
						attributes: ''
					};

					if (tag.content) {
						await Dialog.getByID('bb-toolbar')?.resolve();

						const dialog = new Dialog({
							id: 'bb-toolbar',
							title: tag.title,
							content: tag.content,
							initialValues: Object.assign(
								tagProps,
								tag.initialValues instanceof Function
									? tag.initialValues(children)
									: tag.initialValues
							),
							actions: [
								{ label: 'Okay', autoFocus: false },
								'Cancel'
							]
						});

						if (!(await dialog)?.submit) {
							return;
						}

						// Update `children` in case the user changed their selection since closing the dialog.
						children = textAreaRef.current.value.slice(
							textAreaRef.current.selectionStart,
							textAreaRef.current.selectionEnd
						);

						Object.assign(
							tagProps,
							dialog.form!.values,
							// Spread the updated selection in the `children` value to overwrite the outdated value in the dialog form's values.
							{ children },
							tag.valuesToProps && tag.valuesToProps(dialog.form!.values)
						);
					}

					const openTag = `[${tagName}${
						tagProps.attributes
							// TODO: This should be escaped to prevent "]" in `attributes` from closing the tag, and to prevent "=" from creating new attributes.
							? tagProps.attributes instanceof Object
								? (
									Object.entries(tagProps.attributes).map(
										([name, value]) => ` ${name}=${value}`
									).join('')
								)
								: `=${tagProps.attributes}`
							: ''
					}]`;
					const closeTag = `[/${tagName}]`;

					const selectionStart = textAreaRef.current.selectionStart;

					setValue(
						textAreaRef.current.value.slice(0, selectionStart)
						+ openTag
						+ tagProps.children
						+ closeTag
						+ textAreaRef.current.value.slice(textAreaRef.current.selectionEnd, textAreaRef.current.value.length)
					);

					// This timeout is necessary so the selection of the new value occurs after the new value renders.
					setTimeout(() => {
						textAreaRef.current.focus();

						// It is necessary to use `selectionStart` below instead of `textAreaRef.current.selectionStart` because the latter resets to 0 after the value changes.

						if (tag.selectAfter) {
							textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = (
								selectionStart
								+ openTag.length
								+ tagProps.children.length
								+ closeTag.length
							);
						} else {
							textAreaRef.current.selectionStart = selectionStart + openTag.length;
							textAreaRef.current.selectionEnd = textAreaRef.current.selectionStart + tagProps.children.length;
						}
					});

					// This ESLint comment is necessary because the rule incorrectly thinks `tagName` should be a dependency here, despite that it depends on `tag` which is already a dependency.
					// eslint-disable-next-line react-hooks/exhaustive-deps
				}, [tag, textAreaRef, setValue])
			}
		/>
	);
};

export default BBToolbarButton;