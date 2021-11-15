import type { ChangeEvent } from 'react';
import { useContext, useRef } from 'react';
import { hashlessColorCodeTest } from 'components/BBCode/BBTags';
import { Field, useField } from 'formik';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import SaveButton from 'components/Button/SaveButton';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'lib/client/Dialog';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import useAutoSelect from 'lib/client/reactHooks/useAutoSelect';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import StoryIDContext from 'lib/client/StoryIDContext';
import IDPrefix from 'lib/client/IDPrefix';
import AddButton from 'components/Button/AddButton';

type StoryColorsAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors').default>;
type StoryColorAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors/[colorID]').default>;

const getTwoDigitHex = (dec: string) => `0${(+dec).toString(16)}`.slice(-2);

export type ColorPickerProps = {
	name: string
};

const ColorPicker = ({ name }: ColorPickerProps) => {
	const [, { value }, { setValue }] = useField<string>(name);

	const colorComputerRef = useRef<HTMLDivElement>(null);

	let computedHexColor;
	let computedOpacity = 1;

	// Compute `computedHexColor` and `computedOpacity`.
	if (colorComputerRef.current) {
		// Reset the color before setting the new one, because setting an invalid color doesn't necessarily reset it.
		colorComputerRef.current.style.color = '';
		colorComputerRef.current.style.color = value.replace(hashlessColorCodeTest, '#$1');

		const rgbaMatch = getComputedStyle(colorComputerRef.current).color.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
		if (rgbaMatch) {
			computedHexColor = (
				'#'
				+ getTwoDigitHex(rgbaMatch[1])
				+ getTwoDigitHex(rgbaMatch[2])
				+ getTwoDigitHex(rgbaMatch[3])
			);

			if (rgbaMatch[4]) {
				computedOpacity = +rgbaMatch[4];
			}
		}
	}

	const storyID = useContext(StoryIDContext);

	const saveColor = useFunction(async () => {
		const dialog = new Dialog({
			id: 'color-picker',
			title: 'Save Color',
			initialValues: {
				group: 'default',
				name: value
			},
			content: function Content() {
				return (
					<IDPrefix.Provider value="color-picker">
						<LabeledGrid>
							<LabeledGridRow htmlFor="color-picker-field-group" label="Color Group">
								<Field
									as="select"
									id="color-picker-field-group"
									name="group"
									className="spaced"
									required
								>
									<option
										value="default"
										style={{ fontStyle: 'italic' }}
									>
										(No Group)
									</option>
								</Field>
								<AddButton
									className="spaced"
									title="Create Color Group"
									onClick={
										useFunction(() => {

										})
									}
								/>
							</LabeledGridRow>
							<LabeledGridRow label="Color Value">
								{value}
							</LabeledGridRow>
							<LabeledGridField
								name="name"
								label="Color Label"
								help={'This label is the name associated with your saved color.\n\nIt can be anything and doesn\'t have to match the actual value of the color. For example, "John Egbert" or "blue".'}
								autoComplete="off"
								innerRef={useAutoSelect() as any}
							/>
						</LabeledGrid>
					</IDPrefix.Provider>
				);
			},
			actions: [
				{ label: 'Save!', autoFocus: false },
				'Cancel'
			]
		});

		if (!(await dialog)?.submit) {
			return;
		}

		const { data: color } = await (api as StoryColorsAPI).post(`/stories/${storyID}/colors`, {
			name: dialog.form!.values.name,
			value
		});

		console.log(color);
	});

	return (
		<>
			<div
				id="bb-tool-color-computer"
				ref={colorComputerRef}
			/>
			<LabeledGrid>
				<LabeledGridRow htmlFor="bb-tool-field-attributes" label="Color">
					<input
						type="color"
						className="spaced"
						style={{
							opacity: computedOpacity
						}}
						value={
							colorComputerRef.current
								? computedHexColor
								: value
						}
						onChange={
							useFunction((event: ChangeEvent<HTMLInputElement>) => {
								setValue(event.target.value);
							})
						}
					/>
					<Field
						id="bb-tool-field-attributes"
						name={name}
						className="spaced"
						required
						autoFocus
						size={9}
						innerRef={useAutoSelect()}
					/>
					{storyID && (
						<SaveButton
							className="spaced"
							title="Save Color"
							onClick={saveColor}
						/>
					)}
				</LabeledGridRow>
			</LabeledGrid>
		</>
	);
};

export default ColorPicker;