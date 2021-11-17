import type { DragEvent } from 'react';
import React, { useContext, useState } from 'react';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import PrivateStoryContext from 'lib/client/PrivateStoryContext';
import type { ColorProps } from 'components/ColorTool/Color';
import Row from 'components/Row';
import Label from 'components/Label';
import Color from 'components/ColorTool/Color';
import EditButton from 'components/Button/EditButton';
import CheckButton from 'components/Button/CheckButton';
import type { ClientColor, ClientColorGroup } from 'lib/client/colors';
import ColorGroupLabel from 'components/ColorTool/ColorGroupLabel';
import Button from 'components/Button';
import promptCreateColorGroup from 'lib/client/promptCreateColorGroup';

export type SavedColorsProps = Pick<ColorProps, 'name'>;

/** The saved colors section of `ColorTool`. */
const SavedColors = React.memo(({ name }: SavedColorsProps) => {
	const [story, setStory] = useContext(PrivateStoryContext)!;

	/** Gets all of the `story`'s colors which have the specified `group` property. */
	const getColorsByGroup = (colorGroupID: string | undefined) => (
		story.colors.filter(({ group }) => group === colorGroupID)
	);

	const grouplessColors = getColorsByGroup(undefined);

	const [editing, setEditing] = useState(false);

	const toggleEditing = useFunction(() => {
		setEditing(editing => !editing);
	});

	const getColor = (color: ClientColor) => (
		<Color
			key={color.id}
			name={name}
			editing={editing}
		>
			{color}
		</Color>
	);

	const onClickCreateColorGroup = useFunction(() => {
		promptCreateColorGroup(story, setStory);
	});

	const SavedColorsComponent = editing ? 'div' : LabeledGrid;

	return (
		<SavedColorsComponent
			id="saved-colors"
			onDragOver={
				useFunction((event: DragEvent<HTMLDivElement>) => {
					event.preventDefault();

					event.dataTransfer.dropEffect = 'move';
				})
			}
			onDrop={
				useFunction((event: DragEvent<HTMLDivElement>) => {
					event.preventDefault();

					const colorGroupString = event.dataTransfer.getData('application/vnd.mspfa.color-group');
					if (colorGroupString) {
						const colorGroup: ClientColorGroup = JSON.parse(colorGroupString);

						console.log(colorGroup);

						return;
					}

					const colorString = event.dataTransfer.getData('application/vnd.mspfa.color');
					if (colorString) {
						const color: ClientColor = JSON.parse(colorString);

						console.log(color);
					}
				})
			}
		>
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
				<Row id="color-group-undefined" className="color-group">
					{editing && (
						<Label block>
							No Group
						</Label>
					)}
					{grouplessColors.map(getColor)}
				</Row>
			)}
			{story.colorGroups.map(colorGroup => {
				const colors = getColorsByGroup(colorGroup.id);

				return editing ? (
					<Row
						key={colorGroup.id}
						id={`color-group-${colorGroup.id}`}
						className="color-group"
					>
						<ColorGroupLabel>{colorGroup}</ColorGroupLabel>
						{colors.length ? (
							colors.map(getColor)
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
								{colors.map(getColor)}
							</span>
						) : (
							<span className="translucent">
								(Empty)
							</span>
						)}
					</LabeledGridRow>
				);
			})}
			{editing && (
				<Row>
					<Button
						className="small"
						onClick={onClickCreateColorGroup}
					>
						Create Color Group
					</Button>
				</Row>
			)}
		</SavedColorsComponent>
	);
});

export default SavedColors;