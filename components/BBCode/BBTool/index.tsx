import './styles.module.scss';
import { useContext, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { BBFieldContext } from 'components/BBCode/BBField';
import Button from 'components/Button';
import Dialog from 'lib/client/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import Label from 'components/Label';
import type { FormikProps } from 'formik';
import Row from 'components/Row';
import Link from 'components/Link';
import { getChangedValues } from 'lib/client/forms';
import IDPrefix from 'lib/client/reactContexts/IDPrefix';
import useLatest from 'lib/client/reactHooks/useLatest';
import { youTubeVideoIDTest } from 'components/BBCode/BBTags';
import type { integer } from 'lib/types';
import escapeBBAttribute from 'lib/client/escapeBBAttribute';
import dynamic from 'next/dynamic';
import Loading from 'components/LoadingIndicator/Loading';

const ColorTool = dynamic(() => import('components/ColorTool'), { loading: Loading });

const defaultBBPreview = 'The quick brown fox jumps over the lazy dog.';

const randomColorAttributes = () => ({
	attributes: '#' + `00000${Math.floor(Math.random() * 0x1000000).toString(16)}`.slice(-6)
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
		content: <ColorTool name="attributes" />
	},
	background: {
		title: 'Text Background Color',
		initialValues: randomColorAttributes,
		content: <ColorTool name="attributes" />
	},
	size: {
		title: 'Font Size',
		content: ({ values }) => (
			<LabeledGrid>
				<LabeledGridField
					type="number"
					name="attributes"
					label="Percent Size"
					required
					autoFocus
					min={0}
					max={9999}
				/>
				<Row>
					<Label block htmlFor="field-bb-preview">
						Preview
					</Label>
					<div id="field-bb-preview-container">
						<textarea
							id="field-bb-preview"
							defaultValue={defaultBBPreview}
							rows={3}
							style={(
								typeof values.attributes === 'number'
									? { fontSize: `${values.attributes}%` }
									: undefined
							)}
						/>
					</div>
				</Row>
			</LabeledGrid>
		)
	},
	font: {
		title: 'Font Family',
		content: ({ values }) => (
			<LabeledGrid>
				<LabeledGridField
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
				</LabeledGridField>
				<LabeledGridField
					name="attributes"
					label="Alternate Font"
					required
				/>
				<Row>
					<Label block htmlFor="field-bb-preview">
						Preview
					</Label>
					<div id="field-bb-preview-container">
						<textarea
							id="field-bb-preview"
							defaultValue={defaultBBPreview}
							rows={3}
							style={{ fontFamily: values.attributes }}
						/>
					</div>
				</Row>
			</LabeledGrid>
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
			[/^(?:\w+:)?\/\//.test(children) ? 'attributes' : 'children']: children
		}),
		content: ({ initialValues }) => (
			<LabeledGrid>
				<LabeledGridField
					type="url"
					name="attributes"
					label="URL"
					required
					autoFocus={!initialValues.attributes}
					autoComplete="off"
				/>
				<LabeledGridField
					as="textarea"
					name="children"
					label="Link Text"
					placeholder="Optional"
					autoFocus={!!initialValues.attributes}
				/>
			</LabeledGrid>
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
			advancedMode: false,
			show: '',
			hide: ''
		},
		content: ({ values: { advancedMode } }) => (
			<LabeledGrid>
				{!advancedMode && (
					<LabeledGridField
						name="attributes"
						label="Spoiler Name"
						help={'The name used in the spoiler\'s button text.\n\nFor example, setting this to "Pesterlog" makes the button say "Show Pesterlog" when the spoiler is closed and "Hide Pesterlog" when the spoiler is open.\n\nLeaving this empty makes the button say "Show" or "Hide" with nothing after it.'}
						autoFocus
						placeholder="Optional"
					/>
				)}
				<LabeledGridField
					type="checkbox"
					name="advancedMode"
					label="Advanced Mode"
				/>
				{advancedMode && (
					<>
						<LabeledGridField
							name="show"
							label={'"Show" Button Text'}
							help={'The spoiler\'s button text when the spoiler is closed.'}
							autoFocus
							placeholder="Optional"
						/>
						<LabeledGridField
							name="hide"
							label={'"Hide" Button Text'}
							help={'The spoiler\'s button text when the spoiler is open.'}
							placeholder="Optional"
						/>
					</>
				)}
			</LabeledGrid>
		),
		getProps: ({ values: { attributes, advancedMode, show, hide } }) => ({
			attributes: (
				advancedMode
					? show || hide
						? {
							...!!show && { show },
							...!!hide && { hide }
						}
						: undefined
					: attributes || undefined
			)
		})
	},
	chat: { title: 'Chat' },
	alt: {
		title: 'Hover Text',
		content: (
			<LabeledGrid>
				<LabeledGridField
					name="attributes"
					label="Hover Text"
					required
					autoFocus
					autoComplete="off"
				/>
			</LabeledGrid>
		)
	},
	img: {
		title: 'Image',
		initialValues: {
			width: '',
			height: ''
		},
		content: (
			<LabeledGrid>
				<LabeledGridField
					type="url"
					name="children"
					label="Image URL"
					required
					autoFocus
					autoComplete="off"
					help="TODO: Add info on getting image URLs."
				/>
				<LabeledGridField
					type="number"
					name="width"
					label="Width"
					placeholder="Optional"
					min={0}
				/>
				<LabeledGridField
					type="number"
					name="height"
					label="Height"
					placeholder="Optional"
					min={0}
				/>
			</LabeledGrid>
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
	video: {
		title: 'Video Embed',
		initialValues: {
			width: '',
			height: '',
			autoplay: false,
			controls: true,
			loop: false
		},
		content: ({ values: { children: url } }) => {
			const urlFromYouTube = youTubeVideoIDTest.test(url);

			return (
				<LabeledGrid>
					<LabeledGridField
						type="url"
						name="children"
						label="Video URL"
						required
						autoFocus
						autoComplete="off"
						help={(
							<>
								Examples:
								<ul>
									<li>https://example.com/video.mp4</li>
									<li>https://www.youtube.com/watch?v=7wiNUBaK-6M</li>
									<li>https://youtu.be/7wiNUBaK-6M</li>
								</ul>
							</>
						)}
					/>
					{/* YouTube requires embedded players to have a viewport that is at least 200x200 pixels. */}
					{/* Source: https://developers.google.com/youtube/iframe_api_reference#Requirements */}
					{/* Also, width and height are required fields here since the `iframe` has no good way of determining a good default size for the video. */}
					<LabeledGridField
						type="number"
						name="width"
						label="Width"
						required={urlFromYouTube}
						min={urlFromYouTube ? 200 : 0}
					/>
					<LabeledGridField
						type="number"
						name="height"
						label="Height"
						required={urlFromYouTube}
						min={urlFromYouTube ? 200 : 0}
					/>
					<LabeledGridField type="checkbox" name="autoplay" label="Autoplay" />
					<LabeledGridField type="checkbox" name="controls" label="Show Controls" />
					<LabeledGridField type="checkbox" name="loop" label="Loop" />
					{/* TODO: Put this in a BBCode guide instead. */}
					<Row>
						<Link
							href="https://developers.google.com/youtube/player_parameters#Parameters"
							target="_blank"
						>
							Advanced YouTube Attribute List
						</Link>
					</Row>
				</LabeledGrid>
			);
		},
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
			<LabeledGrid>
				<LabeledGridField
					type="url"
					name="children"
					label="HTML File URL"
					required
					autoFocus
					autoComplete="off"
					help={(
						<>
							A direct link to an HTML file (usually called "index.html"). You can upload HTML files to a file host that supports HTML5, such as <Link href="https://pipe.miroware.io" target="_blank">Miroware Pipe</Link>.<br />
							<br />
							If you need help extracting, uploading, and/or embedding HTML, feel free to ask in the #technical-help channel of <Link href="/discord" target="_blank">our Discord server</Link>.
						</>
					)}
				/>
				<LabeledGridField
					type="number"
					name="width"
					label="Width"
					required
					min={0}
				/>
				<LabeledGridField
					type="number"
					name="height"
					label="Height"
					required
					min={0}
				/>
			</LabeledGrid>
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
			<LabeledGrid>
				<Row className="red">
					It is highly recommended not to use Flash due to its loss of support. Consider using video or HTML5 instead.
				</Row>
				<LabeledGridField
					type="url"
					name="children"
					label="SWF File URL"
					required
					autoFocus
					autoComplete="off"
				/>
				<LabeledGridField
					type="number"
					name="width"
					label="Width"
					required
					min={0}
				/>
				<LabeledGridField
					type="number"
					name="height"
					label="Height"
					required
					min={0}
				/>
			</LabeledGrid>
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
const tagIndexes: Record<string, integer> = {};
const tagNames = Object.keys(tags);
for (let i = 0; i < tagNames.length; i++) {
	tagIndexes[tagNames[i]] = i;
}

export type BBToolProps = {
	/** The name of the BB tag which the BB tool creates. */
	tag: string
};

/** A button in a `BBToolbar` with a corresponding BB tag. */
const BBTool = ({ tag: tagName }: BBToolProps) => {
	const tag = tags[tagName];

	const { textAreaRef, setValue, disabled } = useContext(BBFieldContext)!;
	/** A ref to the latest value of `disabled` to avoid race conditions. */
	const disabledRef = useLatest(disabled);

	// Whether this BB tool currently has an open dialog.
	const [open, setOpen] = useState(false);

	return (
		<Button
			icon={{
				style: {
					backgroundPositionY: `${-tagIndexes[tagName]}em`
				}
			}}
			className={`bb-tool bb-tool-${tagName}${open ? ' open' : ''}`}
			title={tag.title}
			disabled={disabled}
			onClick={
				useFunction(async () => {
					let children = textAreaRef.current.value.slice(
						textAreaRef.current.selectionStart,
						textAreaRef.current.selectionEnd
					);

					/** Information about this instance of the BB tag, including children, attributes, and other form values. */
					const tagData: NewBBTagProps = {
						children,
						// This needs to initially be an empty string and not `undefined` so that the form's initial values include this property, and any fields with `name="attributes"` are initially Formik-controlled.
						attributes: '',
						...tag.initialValues instanceof Function
							? tag.initialValues(children)
							: tag.initialValues
					};

					if (tag.content) {
						// Close any existing BB tool dialog.
						await Dialog.getByID('bb-tool')?.resolve();

						setOpen(true);

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
							initialValues: { ...tagData },
							actions: [
								{ label: 'Okay', autoFocus: false },
								'Cancel'
							]
						});

						const dialogResult = await dialog;

						setOpen(false);

						if (!dialogResult?.submit) {
							return;
						}

						if (disabledRef.current) {
							new Dialog({
								id: 'bb-tool',
								title: tag.title,
								content: 'The specified BBCode could not be inserted into the target text area, as it is currently read-only.'
							});
							return;
						}

						// Update `children` in case the user changed their selection while the dialog was open.
						children = textAreaRef.current.value.slice(
							textAreaRef.current.selectionStart,
							textAreaRef.current.selectionEnd
						);

						Object.assign(
							tagData,
							dialog.form!.values,
							// Spread the updated selection in the `children` value to overwrite the outdated value in the dialog form's values.
							{ children },
							tag.getProps && tag.getProps(dialog.form!)
						);
					}

					let openTag = `[${tagName}`;
					if (tagData.attributes) {
						if (tagData.attributes instanceof Object) {
							for (const key of Object.keys(tagData.attributes)) {
								const value = tagData.attributes[key];
								if (value !== undefined) {
									openTag += ` ${key}=${escapeBBAttribute(value.toString(), true)}`;
								}
							}
						} else {
							openTag += `=${escapeBBAttribute(tagData.attributes.toString())}`;
						}
					}
					openTag += ']';

					const closeTag = `[/${tagName}]`;

					const selectionStart = textAreaRef.current.selectionStart;

					setValue(
						textAreaRef.current.value.slice(0, selectionStart)
						+ openTag
						+ tagData.children
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
								+ tagData.children.length
								+ closeTag.length
							);
						} else {
							textAreaRef.current.selectionStart = selectionStart + openTag.length;
							textAreaRef.current.selectionEnd = textAreaRef.current.selectionStart + tagData.children.length;
						}
					});
				})
			}
		/>
	);
};

export default BBTool;