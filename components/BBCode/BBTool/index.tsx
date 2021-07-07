import './styles.module.scss';
import { useContext, useCallback } from 'react';
import { TextAreaRefContext } from 'components/BBCode/BBField';
import Button from 'components/Button';
import { Dialog } from 'modules/client/dialogs';
import { videoIDTest } from 'components/BBCode/BBTags';
import LabeledDialogBox from 'components/Box/LabeledDialogBox';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import Label from 'components/Label';
import type { FormikProps } from 'formik';
import { Field } from 'formik';
import BoxRow from 'components/Box/BoxRow';
import Link from 'components/Link';
import { getChangedValues } from 'modules/client/forms';
import IDPrefix from 'modules/client/IDPrefix';

const bbPreview = 'The quick brown fox jumps over the lazy dog.';

const randomColorAttributes = () => ({
	attributes: `#${`00000${Math.floor(Math.random() * 0x1000000).toString(16)}`.slice(-6)}`
});

const presetFontFamilies = ['Arial', 'Bodoni MT', 'Book Antiqua', 'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Courier New', 'Garamond', 'Georgia', 'Goudy Old Style', 'Helvetica', 'Homestuck-Regular', 'Impact', 'Lucida Bright', 'Lucida Console', 'Lucida Sans Typewriter', 'Perpetua', 'Rockwell', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];

type NewBBTagProps = {
	/** The content of the BB tag. */
	children: string,
	attributes: string | number | Partial<Record<string, string | number>>
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
	 * The content of the BB tool dialog that opens when the `BBTool` is clicked.
	 *
	 * If `undefined`, no dialog will open when the `BBTool` is clicked.
	 */
	content?: Dialog<Record<string, any>>['content'],
	/**
	 * A function called when the BB tool dialog closes.
	 *
	 * The dialog form's values are passed in, and the return value is spread with the form's values and the current selected `children` to the BB tag's props.
	 */
	getProps?: <Values extends Record<string, any>>(
		values: FormikProps<Values>
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
		getProps: ({ values: { attributes, children } }) => {
			const childrenIsURL = !children || attributes === children;

			return {
				attributes: childrenIsURL ? undefined : attributes,
				children: childrenIsURL ? attributes : children
			};
		}
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
		getProps: ({ values: { open, close } }) => ({
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
	chat: { title: 'Chat' },
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
		getProps: ({ values: { width, height, children } }) => ({
			children,
			attributes: (
				(width || '')
				+ (height ? `x${height}` : '')
			)
		}),
		selectAfter: true
	},
	youtube: {
		title: 'YouTube Embed',
		initialValues: {
			autoplay: false,
			controls: true,
			loop: false
		},
		content: (
			<LabeledDialogBox>
				<FieldBoxRow
					type="text"
					name="children"
					label="YouTube Video URL/ID"
					required
					autoFocus
					pattern={videoIDTest.source}
					help={(
						<>
							Examples:
							<ul>
								<li>https://www.youtube.com/watch?v=7wiNUBaK-6M</li>
								<li>https://youtu.be/7wiNUBaK-6M</li>
								<li>7wiNUBaK-6M</li>
							</ul>
						</>
					)}
				/>
				{/* YouTube requires embedded players to have a viewport that is at least 200x200. */}
				{/* Source: https://developers.google.com/youtube/iframe_api_reference#Requirements */}
				<FieldBoxRow
					type="number"
					name="width"
					label="Width"
					placeholder="Optional"
					min={200}
				/>
				<FieldBoxRow
					type="number"
					name="height"
					label="Height"
					placeholder="Optional"
					min={200}
				/>
				<FieldBoxRow type="checkbox" name="autoplay" label="Autoplay" />
				<FieldBoxRow type="checkbox" name="controls" label="Show Player Controls" />
				<FieldBoxRow type="checkbox" name="loop" label="Loop" />
				<BoxRow>
					<Link
						href="https://developers.google.com/youtube/player_parameters#Parameters"
						target="_blank"
					>
						Advanced Attribute List
					</Link>
				</BoxRow>
			</LabeledDialogBox>
		),
		getProps: ({
			initialValues,
			values: { children, ...values }
		}) => {
			const changedValues = getChangedValues(initialValues, values);

			return {
				attributes: changedValues && Object.fromEntries(
					Object.entries(changedValues as typeof values).map(
						([key, value]) => [
							key,
							typeof value === 'boolean'
								? +value
								: value
						]
					)
				),
				children
			};
		},
		selectAfter: true
	},
	iframe: {
		title: 'HTML5 Embed',
		initialValues: {
			width: 650,
			height: 450
		},
		content: (
			<LabeledDialogBox>
				<FieldBoxRow
					type="url"
					name="children"
					label="HTML File URL"
					required
					autoFocus
					help={(
						<>
							A direct link to an HTML file (usually called "index.html"). You can upload HTML files to a file host that supports HTML5, such as <Link href="https://pipe.miroware.io" target="_blank">Miroware Pipe</Link>.<br />
							<br />
							If you need help extracting, uploading, and/or embedding HTML, feel free to ask in the #technical-help channel of <Link href="/discord" target="_blank">our Discord server</Link>.
						</>
					)}
				/>
				<FieldBoxRow
					type="number"
					name="width"
					label="Width"
					required
					min={0}
				/>
				<FieldBoxRow
					type="number"
					name="height"
					label="Height"
					required
					min={0}
				/>
			</LabeledDialogBox>
		),
		getProps: ({ values: { width, height, children } }) => ({
			children,
			attributes: (
				(width || '')
				+ (height ? `x${height}` : '')
			)
		}),
		selectAfter: true
	},
	flash: {
		title: 'Flash Embed',
		initialValues: {
			width: 650,
			height: 450
		},
		content: (
			<LabeledDialogBox>
				<BoxRow className="red">
					It is highly recommended not to use Flash due to its loss of support. Consider using video or HTML5 instead.
				</BoxRow>
				<FieldBoxRow
					type="url"
					name="children"
					label="SWF File URL"
					required
					autoFocus
				/>
				<FieldBoxRow
					type="number"
					name="width"
					label="Width"
					required
					min={0}
				/>
				<FieldBoxRow
					type="number"
					name="height"
					label="Height"
					required
					min={0}
				/>
			</LabeledDialogBox>
		),
		getProps: ({ values: { width, height, children } }) => ({
			children,
			attributes: (
				(width || '')
				+ (height ? `x${height}` : '')
			)
		}),
		selectAfter: true
	}
};

// The above `tags` must be in the same order as the BB tool icon sheet.

/** The indexes of each tag within the BB tool icon sheet. */
const tagIndexes = Object.fromEntries(
	Object.keys(tags).map(
		(tagName, i) => [tagName, i]
	)
);

/** Escapes a user-inputted attribute value for use in BBCode. */
const escapeAttribute = (value: string, handleEqualSigns?: boolean) => {
	if (value.includes(']') || (handleEqualSigns && value.includes('='))) {
		if (value.includes('"') && !value.includes('\'')) {
			return `'${value}'`;
		}

		return `"${value.replace(/"/g, '&quot;')}"`;
	}

	if (value[0] === '"') {
		if (value.includes('\'')) {
			return `&quot;${value.slice(1)}`;
		}

		return `'${value}'`;
	}

	if (value[0] === '\'') {
		if (value.includes('"')) {
			return `&apos;${value.slice(1)}`;
		}

		return `"${value}"`;
	}

	return value;
};

export type BBToolProps = {
	/** The name of the BB tag which the BB tool creates. */
	tag: string
};

/** A button in a `BBToolbar` with a corresponding BB tag. */
const BBTool = ({ tag: tagName }: BBToolProps) => {
	const tag = tags[tagName];

	const { textAreaRef, setValue } = useContext(TextAreaRefContext);

	return (
		<Button
			className="icon bb-tool"
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
						await Dialog.getByID('bb-tool')?.resolve();

						const dialog = new Dialog<Record<string, any>>({
							id: 'bb-tool',
							title: tag.title,
							content: props => (
								<IDPrefix.Provider value="bb-tool">
									{(tag.content instanceof Function
										? tag.content(props)
										: tag.content
									)}
								</IDPrefix.Provider>
							),
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

						// Update `children` in case the user changed their selection while the dialog was open.
						children = textAreaRef.current.value.slice(
							textAreaRef.current.selectionStart,
							textAreaRef.current.selectionEnd
						);

						Object.assign(
							tagProps,
							dialog.form!.values,
							// Spread the updated selection in the `children` value to overwrite the outdated value in the dialog form's values.
							{ children },
							tag.getProps && tag.getProps(dialog.form!)
						);
					}

					const openTag = `[${tagName}${
						tagProps.attributes
							? tagProps.attributes instanceof Object
								? (
									Object.entries(tagProps.attributes).map(
										([name, value]) => ` ${name}=${escapeAttribute(value!.toString(), true)}`
									).join('')
								)
								: `=${escapeAttribute(tagProps.attributes.toString())}`
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

export default BBTool;