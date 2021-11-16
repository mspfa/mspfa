import { useContext, useRef } from 'react';
import { Field, useField } from 'formik';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import useAutoSelect from 'lib/client/reactHooks/useAutoSelect';
import PrivateStoryContext from 'lib/client/PrivateStoryContext';
import IDPrefix from 'lib/client/IDPrefix';
import AddButton from 'components/Button/AddButton';
import ColorField from 'components/ColorField';
import promptCreateColorGroup from 'lib/client/promptCreateColorGroup';

/**
 * A `LabeledGrid` of form fields containing options for a `ClientColor`.
 *
 * Must be placed in a Formik form with values named `group`, `name`, and `value` (corresponding to the properties of a `ClientColor`).
 */
const ColorOptions = () => {
	const [story, setStory] = useContext(PrivateStoryContext)!;

	const [, , { setValue: setGroup }] = useField<string>('group');

	const colorGroupFieldRef = useRef<HTMLSelectElement>(null!);

	return (
		<IDPrefix.Provider value="color-options">
			<LabeledGrid>
				<LabeledGridRow htmlFor="color-options-field-group" label="Color Group">
					<Field
						as="select"
						id="color-options-field-group"
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
								const colorGroup = await promptCreateColorGroup(story, setStory);

								setGroup(colorGroup.id);
								colorGroupFieldRef.current.focus();
							})
						}
					/>
				</LabeledGridRow>
				<LabeledGridRow htmlFor="color-options-field-value" label="Color Value">
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
					required
					maxLength={50}
					autoComplete="off"
					innerRef={useAutoSelect() as any}
				/>
			</LabeledGrid>
		</IDPrefix.Provider>
	);
};

export default ColorOptions;