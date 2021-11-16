import type { MouseEvent } from 'react';
import { useContext, useRef } from 'react';
import { Field, useField, useFormikContext } from 'formik';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import SaveButton from 'components/Button/SaveButton';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'lib/client/Dialog';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import useAutoSelect from 'lib/client/reactHooks/useAutoSelect';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import PrivateStoryContext from 'lib/client/PrivateStoryContext';
import IDPrefix from 'lib/client/IDPrefix';
import AddButton from 'components/Button/AddButton';
import type { ColorFieldProps } from 'components/ColorField';
import ColorField from 'components/ColorField';
import Row from 'components/Row';
import Label from 'components/Label';
import ColorCell from 'components/ColorCell';

type StoryColorGroupsAPI = APIClient<typeof import('pages/api/stories/[storyID]/colorGroups').default>;
type StoryColorGroupAPI = APIClient<typeof import('pages/api/stories/[storyID]/colorGroups/[colorGroupID]').default>;
type StoryColorsAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors').default>;
type StoryColorAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors/[colorID]').default>;

export type ColorToolProps = ColorFieldProps;

/** The content of a color BB tool. */
const ColorTool = ({ name }: ColorToolProps) => {
	const [, { value }, { setValue }] = useField<string>(name);
	const { submitForm } = useFormikContext();

	const [story, setStory] = useContext(PrivateStoryContext) || [];

	const saveColor = useFunction(async () => {
		const saveColorDialog = new Dialog({
			id: 'save-color',
			title: 'Save Color',
			initialValues: {
				group: '',
				value,
				name: value
			},
			content: function Content({ setFieldValue }) {
				const [story, setStory] = useContext(PrivateStoryContext)!;

				const colorGroupFieldRef = useRef<HTMLSelectElement>(null!);

				return (
					<IDPrefix.Provider value="save-color">
						<LabeledGrid>
							<LabeledGridRow htmlFor="save-color-field-group" label="Color Group">
								<Field
									as="select"
									id="save-color-field-group"
									name="group"
									className="spaced"
									innerRef={colorGroupFieldRef}
								>
									{story.colorGroups.map(colorGroup => (
										<option
											key={colorGroup.id}
											value={colorGroup.id}
										>
											{colorGroup.name}
										</option>
									))}
									<option value="">
										(No Group)
									</option>
								</Field>
								<AddButton
									className="spaced"
									title="Create Color Group"
									onClick={
										useFunction(async () => {
											const colorGroupDialog = new Dialog({
												id: 'color-group',
												title: 'Create Color Group',
												initialValues: { name: '' },
												content: (
													<IDPrefix.Provider value="color-group">
														<LabeledGrid>
															<LabeledGridField
																name="name"
																label="Name"
																autoFocus
																autoComplete="off"
															/>
														</LabeledGrid>
													</IDPrefix.Provider>
												),
												actions: [
													{ label: 'Okay', autoFocus: false },
													'Cancel'
												]
											});

											if (!(await colorGroupDialog)?.submit) {
												return;
											}

											const { data: colorGroup } = await (api as StoryColorGroupsAPI).post(`/stories/${story.id}/colorGroups`, {
												name: colorGroupDialog.form!.values.name
											});

											setStory(story => ({
												...story,
												colorGroups: [
													...story.colorGroups,
													colorGroup
												]
											}));

											setFieldValue('group', colorGroup.id);
											colorGroupFieldRef.current.focus();
										})
									}
								/>
							</LabeledGridRow>
							<LabeledGridRow htmlFor="save-color-field-value" label="Color Value">
								<ColorField
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

		if (!(await saveColorDialog)?.submit) {
			return;
		}

		const { data: color } = await (api as StoryColorsAPI).post(`/stories/${story!.id}/colors`, {
			...saveColorDialog.form!.values.group && {
				group: saveColorDialog.form!.values.group
			},
			name: saveColorDialog.form!.values.name,
			value: saveColorDialog.form!.values.value
		});

		setStory!(story => ({
			...story,
			colors: [
				...story.colors,
				color
			]
		}));
	});

	const onClickColorCell = useFunction((event: MouseEvent<HTMLButtonElement> & { target: HTMLButtonElement }) => {
		const newValue = event.target.dataset.value;

		if (!newValue) {
			return;
		}

		setValue(newValue);
		submitForm();
	});

	return (
		<>
			<Row>
				<LabeledGrid>
					<LabeledGridRow htmlFor="bb-tool-field-attributes" label="Color">
						<ColorField
							name={name}
							required
							innerRef={useAutoSelect()}
						/>
						{story && (
							<SaveButton
								className="spaced"
								title="Save Color"
								onClick={saveColor}
							/>
						)}
					</LabeledGridRow>
				</LabeledGrid>
			</Row>
			{story && !!(story.colors.length || story.colorGroups.length) && (() => {
				const grouplessColors = story.colors.filter(({ group }) => !group);

				return (
					<Row>
						<LabeledGrid>
							<Row>
								<Label>Saved Colors</Label>
							</Row>
							{grouplessColors.length !== 0 && (
								<Row>
									{grouplessColors.map(color => (
										<ColorCell
											key={color.id}
											onClick={onClickColorCell}
										>
											{color}
										</ColorCell>
									))}
								</Row>
							)}
							{story.colorGroups.map(colorGroup => {
								const colors = story.colors.filter(({ group }) => group === colorGroup.id);

								return (
									<LabeledGridRow
										key={colorGroup.id}
										label={colorGroup.name}
									>
										{colors.length ? (
											colors.map(color => (
												<ColorCell
													key={color.id}
													onClick={onClickColorCell}
												>
													{color}
												</ColorCell>
											))
										) : (
											<span className="translucent">
												(Empty)
											</span>
										)}
									</LabeledGridRow>
								);
							})}
						</LabeledGrid>
					</Row>
				);
			})()}
		</>
	);
};

export default ColorTool;