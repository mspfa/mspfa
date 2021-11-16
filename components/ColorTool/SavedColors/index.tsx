import type { MouseEvent } from 'react';
import { useContext, useState } from 'react';
import { useField, useFormikContext } from 'formik';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { APIClient } from 'lib/client/api';
import PrivateStoryContext from 'lib/client/PrivateStoryContext';
import type { ColorFieldProps } from 'components/ColorField';
import Row from 'components/Row';
import Label from 'components/Label';
import ColorButton from 'components/ColorTool/ColorButton';
import EditButton from 'components/Button/EditButton';
import CheckButton from 'components/Button/CheckButton';
import type { ClientColor } from 'lib/client/colors';

type StoryColorGroupsAPI = APIClient<typeof import('pages/api/stories/[storyID]/colorGroups').default>;
type StoryColorGroupAPI = APIClient<typeof import('pages/api/stories/[storyID]/colorGroups/[colorGroupID]').default>;
type StoryColorsAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors').default>;
type StoryColorAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors/[colorID]').default>;

export type SavedColorsProps = {
	/** The `name` of the Formik field to set the value of the selected color into. */
	name: ColorFieldProps['name']
};

/** The saved colors section of `ColorTool`. */
const SavedColors = ({ name }: SavedColorsProps) => {
	const [, , { setValue }] = useField<string>(name);
	const { submitForm } = useFormikContext();

	const [story, setStory] = useContext(PrivateStoryContext)!;

	const onClickColorButton = useFunction((
		event: MouseEvent<HTMLButtonElement & HTMLAnchorElement> & { target: HTMLButtonElement }
	) => {
		const colorID = event.target.id.slice('color-button-'.length);
		console.log(colorID);
		const color = story.colors.find(({ id }) => id === colorID)!;

		setValue(color.value);
		submitForm();
	});

	const [editing, setEditing] = useState(false);

	const toggleEditing = useFunction(() => {
		setEditing(editing => !editing);
	});

	const grouplessColors = story.colors.filter(({ group }) => !group);

	const getColorButton = (color: ClientColor) => (
		<ColorButton
			key={color.id}
			onClick={onClickColorButton}
		>
			{color}
		</ColorButton>
	);

	return (
		<Row>
			<LabeledGrid>
				<Row>
					<Label
						afterLabel={
							editing ? (
								<CheckButton
									className="spaced"
									title="Finish Editing"
									onClick={toggleEditing}
								/>
							) : (
								<EditButton
									className="spaced"
									title="Edit Saved Colors"
									onClick={toggleEditing}
								/>
							)
						}
					>
						Saved Colors
					</Label>
				</Row>
				{grouplessColors.length !== 0 && (
					<Row>
						{grouplessColors.map(getColorButton)}
					</Row>
				)}
				{story.colorGroups.map(colorGroup => {
					const colors = story.colors.filter(({ group }) => group === colorGroup.id);

					return editing ? (
						colorGroup.name
					) : (
						<LabeledGridRow
							key={colorGroup.id}
							label={colorGroup.name}
						>
							{colors.length ? (
								// This `span` is necessary to allow the color buttons to wrap normally rather than being flex items.
								<span>
									{colors.map(getColorButton)}
								</span>
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
};

export default SavedColors;