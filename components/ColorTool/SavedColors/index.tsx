import React, { useContext, useState } from 'react';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import PrivateStoryContext from 'lib/client/PrivateStoryContext';
import type { ColorButtonProps } from 'components/ColorTool/ColorButton';
import Row from 'components/Row';
import Label from 'components/Label';
import ColorButton from 'components/ColorTool/ColorButton';
import EditButton from 'components/Button/EditButton';
import CheckButton from 'components/Button/CheckButton';
import type { ClientColor } from 'lib/client/colors';
import ColorGroupLabel from 'components/ColorTool/ColorGroupLabel';

export type SavedColorsProps = Pick<ColorButtonProps, 'name'>;

/** The saved colors section of `ColorTool`. */
const SavedColors = React.memo(({ name }: SavedColorsProps) => {
	const [story] = useContext(PrivateStoryContext)!;

	/** Gets all of the `story`'s colors which have the specified `group` property. */
	const getColorsByGroup = (colorGroupID: string | undefined) => (
		story.colors.filter(({ group }) => group === colorGroupID)
	);

	const grouplessColors = getColorsByGroup(undefined);

	const [editing, setEditing] = useState(false);

	const toggleEditing = useFunction(() => {
		setEditing(editing => !editing);
	});

	const getColorButton = (color: ClientColor) => (
		<ColorButton
			key={color.id}
			name={name}
			editing={editing}
		>
			{color}
		</ColorButton>
	);

	const rows = (
		<>
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
				const colors = getColorsByGroup(colorGroup.id);

				return editing ? (
					<Row key={colorGroup.id}>
						<ColorGroupLabel>{colorGroup}</ColorGroupLabel>
						{colors.length ? (
							colors.map(getColorButton)
						) : (
							<div className="translucent">
								(Empty)
							</div>
						)}
					</Row>
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
		</>
	);

	return editing ? (
		rows
	) : (
		<LabeledGrid>
			{rows}
		</LabeledGrid>
	);
});

export default SavedColors;