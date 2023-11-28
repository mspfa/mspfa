import './styles.module.scss';
import { useContext, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { BBFieldContext } from 'components/BBCode/BBField';
import Button from 'components/Button';
import type { DialogProps, DialogResult } from 'components/Dialog';
import Dialog from 'components/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import Label from 'components/Label';
import Row from 'components/Row';
import Link from 'components/Link';
import { getChangedValues } from 'lib/client/forms';
import IDPrefix from 'lib/client/reactContexts/IDPrefix';
import useLatest from 'lib/client/reactHooks/useLatest';
import { YOUTUBE_VIDEO_ID } from 'components/BBCode/BBTags';
import type { integer } from 'lib/types';
import escapeBBAttribute from 'lib/client/escapeBBAttribute';
import dynamic from 'next/dynamic';
import Loading from 'components/LoadingIndicator/Loading';
import classes from 'lib/client/classes';
import Action from 'components/Dialog/Action';

const ColorTool = dynamic(() => import('components/ColorTool'), { loading: Loading });

const defaultBBPreview = 'The quick brown fox jumps over the lazy dog.';

const randomColorAttributes = () => ({
	attributes: '#' + `00000${Math.floor(Math.random() * 0x1000000).toString(16)}`.slice(-6)
});

const presetFontFamilies = ['Arial', 'Bodoni MT', 'Book Antiqua', 'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Courier New', 'Garamond', 'Georgia', 'Goudy Old Style', 'Helvetica', 'Homestuck-Regular', 'Impact', 'Lucida Bright', 'Lucida Console', 'Lucida Sans Typewriter', 'Perpetua', 'Rockwell', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];

type BBTagCodeOptions = {
	/** The BBCode string inside the BB tag. */
	children: string,
	/** Like `BBTagProps['attributes']` but more lenient, and using `''` instead of `undefined`. */
	attributes: string | number | Partial<Record<string, string | number>>
};

type BBToolDialogValues = Record<string, unknown> & BBTagCodeOptions;

type BBToolOptions = {
	title: string,
	/**
	 * The initial values of the BB tag dialog's form.
	 *
	 * If `children` is unset, it defaults to the user's selected text. `attributes` defaults to `''`.
	 *
	 * If this is a function, the user's selected text is passed in when the dialog opens, and the return value is used instead.
	 */
	initialValues?: Partial<BBToolDialogValues> | (
		(options: { selectedText: string }) => Partial<BBToolDialogValues>
	),
	/**
	 * The content of the BB tool dialog that opens when the `BBTool` is clicked. The dialog's form values used as the BB tag's props.
	 *
	 * If undefined, no dialog will open when the `BBTool` is clicked.
	 */
	dialogContent?: DialogProps<any>['children'],
	/**
	 * The dialog's result is passed into this function, and the return value is spread onto the default `BBTagCodeOptions` object that `getBBTagCode` will be called with.
	 *
	 * The default `BBTagCodeOptions` object is the dialog form's values, but with `children` set to the user's selected text at the time the dialog was closed.
	 */
	getTagCodeOptions?: (dialogResult: DialogResult<any, never>) => Partial<BBToolDialogValues>,
	/** After inserting the tag into the text area, whether to place the text cursor after the tag rather than selecting its children. */
	selectAfter?: boolean
};

// ⚠️ Must be in the same order as the BB tool icon sheet.
const optionsByTagName: Record<string, BBToolOptions> = {
	b: { title: 'Bold' },
	i: { title: 'Italic' },
	u: { title: 'Underline' },
	s: { title: 'Strikethrough' },
	color: {
		title: 'Text Color',
		initialValues: randomColorAttributes,
		dialogContent: <ColorTool name="attributes" />
	},
	background: {
		title: 'Text Background Color',
		initialValues: randomColorAttributes,
		dialogContent: <ColorTool name="attributes" />
	},
	size: {
		title: 'Font Size',
		dialogContent: ({ values }) => (
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
		dialogContent: ({ values }) => (
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
		initialValues: ({ selectedText }) => ({
			attributes: '',
			children: '',
			[/^(?:\w+:)?\/\//.test(selectedText) ? 'attributes' : 'children']: selectedText
		}),
		dialogContent: ({ initialValues }) => (
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
		getTagCodeOptions: ({ values: { attributes, children } }) => {
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
		dialogContent: ({ values: { advancedMode } }) => (
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
							help="The spoiler's button text when the spoiler is closed."
							autoFocus
							placeholder="Optional"
						/>
						<LabeledGridField
							name="hide"
							label={'"Hide" Button Text'}
							help="The spoiler's button text when the spoiler is open."
							placeholder="Optional"
						/>
					</>
				)}
			</LabeledGrid>
		),
		getTagCodeOptions: ({ values: { attributes, advancedMode, show, hide } }) => ({
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
	tooltip: {
		title: 'Tooltip',
		dialogContent: (
			<LabeledGrid>
				<LabeledGridField
					name="attributes"
					label="Tooltip"
					help="Text that appears while hovering over content."
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
		dialogContent: (
			<LabeledGrid>
				<LabeledGridField
					type="url"
					name="children"
					label="Image URL"
					required
					autoFocus
					autoComplete="off"
					help="TODO: Add info on image hosting and getting image URLs."
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
		getTagCodeOptions: ({ values: { width, height, children } }) => ({
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
		dialogContent: ({ values: { children: url } }) => {
			const isFromYouTube = YOUTUBE_VIDEO_ID.test(url);

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
					{/* Also, width and height are required fields here since the `iframe` has no means of determining a good default size for the video. */}
					<LabeledGridField
						type="number"
						name="width"
						label="Width"
						required={isFromYouTube}
						min={isFromYouTube ? 200 : 0}
					/>
					<LabeledGridField
						type="number"
						name="height"
						label="Height"
						required={isFromYouTube}
						min={isFromYouTube ? 200 : 0}
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
		getTagCodeOptions: ({
			initialValues,
			values: { children, ...values }
		}) => {
			const changedAttributes = getChangedValues(initialValues, values);

			if (changedAttributes) {
				for (const [key, value] of Object.entries(changedAttributes)) {
					if (typeof value !== 'boolean') {
						continue;
					}

					changedAttributes[key] = +value;
				}
			}

			return {
				attributes: changedAttributes,
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
		dialogContent: (
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
							A direct link to an HTML file. You can upload HTML files to a file host that supports HTML5, such as <Link href="https://filegarden.com" target="_blank">File Garden</Link>.<br />
							<br />
							If you need help with HTML5, feel free to ask in the #technical-help channel of <Link href="/discord" target="_blank">our Discord server</Link>.
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
		getTagCodeOptions: ({ values: { width, height, children } }) => ({
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
		dialogContent: (
			<>
				<LabeledGrid>
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
				<Row id="bb-flash-warning-container">
					<div id="bb-flash-warning" className="red">
						Browsers no longer support Flash, so we automatically use <Link href="https://ruffle.rs/" target="_blank">Ruffle</Link> to emulate it. Not all Flash features are supported yet, so consider using HTML5 or video instead.
					</div>
				</Row>
			</>
		),
		getTagCodeOptions: ({ values: { width, height, children } }) => ({
			children,
			attributes: (
				(width || '')
				+ (height ? `x${height}` : '')
			)
		}),
		selectAfter: true
	}
};

/** A mapping from each BB tool's tag name to the index of its icon within the BB tool icon sheet. */
const iconIndexes: Record<string, integer> = {};

const tagNames = Object.keys(optionsByTagName);
for (let i = 0; i < tagNames.length; i++) {
	const tagName = tagNames[i];

	iconIndexes[tagName] = i;
}

/** Generates the BBCode for a BB tag. */
const getBBTagCode = (
	tagName: string,
	{ attributes, children }: BBTagCodeOptions
) => {
	let openTagContents = tagName;
	if (attributes) {
		if (attributes instanceof Object) {
			for (const [key, value] of Object.entries(attributes)) {
				if (value === undefined) {
					continue;
				}

				openTagContents += ` ${key}=${escapeBBAttribute(value.toString(), true)}`;
			}
		} else {
			openTagContents += `=${escapeBBAttribute(attributes.toString())}`;
		}
	}

	const openTag = `[${openTagContents}]` as const;
	const closeTag = `[/${tagName}]` as const;
	const tag = `${openTag}${children}${closeTag}` as const;

	return { tag, openTag, closeTag };
};

export type BBToolProps = {
	/** The name of the BB tag which the BB tool creates. */
	tag: string
};

/** A button in a `BBToolbar` with a corresponding BB tag. */
const BBTool = ({ tag: tagName }: BBToolProps) => {
	const options = optionsByTagName[tagName];

	const { textAreaRef, setValue, disabled } = useContext(BBFieldContext)!;
	/** A ref to the latest value of `disabled` to avoid race conditions. */
	const disabledRef = useLatest(disabled);

	// How many open dialogs this BB tool currently has.
	const [dialogCount, setDialogCount] = useState(0);

	const getSelectedText = useFunction(() => (
		textAreaRef.current.value.slice(
			textAreaRef.current.selectionStart,
			textAreaRef.current.selectionEnd
		)
	));

	const onClick = useFunction(async () => {
		let selectedText = getSelectedText();

		/** The options that will be passed into `getBBTagCode`. */
		let tagCodeOptions: BBTagCodeOptions = {
			children: selectedText,
			// An empty string must be used instead of `undefined` so that any fields of the dialog form with `name="attributes"` are initially Formik-controlled.
			attributes: ''
		};

		if (options.dialogContent) {
			setDialogCount(dialogCount => dialogCount + 1);

			const dialog = await Dialog.create<BBToolDialogValues, never>(
				<Dialog<BBToolDialogValues, never>
					id="bb-tool"
					title={options.title}
					initialValues={{
						...tagCodeOptions,
						...options.initialValues instanceof Function
							? options.initialValues({ selectedText })
							: options.initialValues
					}}
				>
					{props => (
						<IDPrefix.Provider value="bb-tool">
							{(options.dialogContent instanceof Function
								? options.dialogContent(props)
								: options.dialogContent
							)}

							{Action.OKAY}
							{Action.CANCEL}
						</IDPrefix.Provider>
					)}
				</Dialog>
			);

			setDialogCount(dialogCount => dialogCount - 1);

			if (dialog.canceled) {
				return;
			}

			if (disabledRef.current) {
				Dialog.create(
					<Dialog id="bb-tool" title={options.title}>
						The specified BBCode could not be inserted into the target text area, as it is currently read-only.
					</Dialog>
				);
				return;
			}

			// Update `selectedText` in case the user changed their selection while the dialog was open.
			selectedText = getSelectedText();

			tagCodeOptions = {
				...dialog.values,
				// Overwrite the selected text from when the dialog opened.
				children: selectedText,
				...options.getTagCodeOptions?.(dialog)
			};
		}

		const textArea = textAreaRef.current;
		const { selectionStart, selectionEnd } = textArea;

		const { tag, openTag, closeTag } = getBBTagCode(tagName, tagCodeOptions);

		setValue(
			textArea.value.slice(0, selectionStart)
			+ tag
			+ textArea.value.slice(selectionEnd)
		);

		// This timeout is necessary so the selection of the new value occurs after the new value renders.
		setTimeout(() => {
			textArea.focus();

			// It is necessary to use `selectionStart` below instead of `textArea.selectionStart` because the latter resets to 0 after the value changes.

			if (options.selectAfter) {
				textArea.selectionStart = textArea.selectionEnd = (
					selectionStart
					+ openTag.length
					+ tagCodeOptions.children.length
					+ closeTag.length
				);
			} else {
				textArea.selectionStart = selectionStart + openTag.length;
				textArea.selectionEnd = textArea.selectionStart + tagCodeOptions.children.length;
			}
		});
	});

	return (
		<Button
			icon={{
				style: {
					backgroundPositionY: `${-iconIndexes[tagName]}em`
				}
			}}
			className={
				classes(`bb-tool bb-tool-${tagName}`, {
					open: dialogCount !== 0
				})
			}
			title={options.title}
			disabled={disabled}
			onClick={onClick}
		/>
	);
};

export default BBTool;
