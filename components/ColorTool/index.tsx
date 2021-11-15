import { useContext } from 'react';
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
import type { ColorPickerProps } from 'components/ColorPicker';
import ColorPicker from 'components/ColorPicker';

type StoryColorsAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors').default>;
type StoryColorAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors/[colorID]').default>;

export type ColorToolProps = ColorPickerProps;

/** The content of a color BB tool. */
const ColorTool = ({ name }: ColorToolProps) => {
	const [, { value }] = useField<string>(name);

	const storyID = useContext(StoryIDContext);

	const saveColor = useFunction(async () => {
		const dialog = new Dialog({
			id: 'color-tool',
			title: 'Save Color',
			initialValues: {
				group: 'default',
				value,
				name: value
			},
			content: function Content() {
				return (
					<IDPrefix.Provider value="color-tool">
						<LabeledGrid>
							<LabeledGridRow htmlFor="color-tool-field-group" label="Color Group">
								<Field
									as="select"
									id="color-tool-field-group"
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
							<LabeledGridRow htmlFor="color-tool-field-value" label="Color Value">
								<ColorPicker
									name="value"
									required
									innerRef={useAutoSelect()}
								/>
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
			value: dialog.form!.values.value
		});

		// TODO
	});

	return (
		<LabeledGrid>
			<LabeledGridRow htmlFor="bb-tool-field-attributes" label="Color">
				<ColorPicker
					name={name}
					required
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
	);
};

export default ColorTool;