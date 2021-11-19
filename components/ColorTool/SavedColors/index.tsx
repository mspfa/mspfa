import type { DragEvent } from 'react';
import React, { useContext, useState, useRef } from 'react';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import PrivateStoryContext from 'lib/client/PrivateStoryContext';
import type { ColorProps } from 'components/ColorTool/Color';
import Row from 'components/Row';
import Label from 'components/Label';
import EditButton from 'components/Button/EditButton';
import CheckButton from 'components/Button/CheckButton';
import ColorGroup from 'components/ColorTool/ColorGroup';
import Button from 'components/Button';
import promptCreateColorGroup from 'lib/client/promptCreateColorGroup';

export type SavedColorsProps = Pick<ColorProps, 'name'>;

/** The saved colors section of `ColorTool`. */
const SavedColors = React.memo(({ name }: SavedColorsProps) => {
	const [story, setStory] = useContext(PrivateStoryContext)!;

	const [editing, setEditing] = useState(false);

	const toggleEditing = useFunction(() => {
		setEditing(editing => !editing);
	});

	const onClickCreateColorGroup = useFunction(() => {
		promptCreateColorGroup(story, setStory);
	});

	/** A ref to whether a color or color group is currently being dragged. */
	const draggingGrabberRef = useRef(false);

	const SavedColorsComponent = editing ? 'div' : LabeledGrid;

	return (
		<SavedColorsComponent
			id="saved-colors"
			className={editing ? 'editing' : undefined}
			onDragStart={
				useFunction((event: DragEvent) => {
					if (!(event.target as HTMLElement).classList.contains('grabber')) {
						return;
					}

					draggingGrabberRef.current = true;
				})
			}
			onDragEnd={
				useFunction(() => {
					draggingGrabberRef.current = false;
				})
			}
			onDragOver={
				useFunction((event: DragEvent<HTMLDivElement>) => {
					if (!(
						draggingGrabberRef.current && (
							event.dataTransfer.types.includes('application/vnd.mspfa.color-group-index')
							|| event.dataTransfer.types.includes('application/vnd.mspfa.color-index')
						)
					)) {
						return;
					}

					event.preventDefault();

					event.dataTransfer.dropEffect = 'move';
				})
			}
			onDrop={
				useFunction((event: DragEvent<HTMLDivElement>) => {
					event.preventDefault();

					const colorGroupIndexString = event.dataTransfer.getData('application/vnd.mspfa.color-group-index');
					if (colorGroupIndexString) {
						const colorGroupIndex = +colorGroupIndexString;
						const colorGroup = story.colorGroups[colorGroupIndex];

						console.log(colorGroup);

						return;
					}

					const colorIndexString = event.dataTransfer.getData('application/vnd.mspfa.color-index');
					if (colorIndexString) {
						const colorIndex = +colorIndexString;
						const color = story.colors[colorIndex];

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
			{[...story.colorGroups, undefined].map(colorGroup => (
				<ColorGroup
					key={String(colorGroup?.id)}
					name={name}
					editing={editing}
				>
					{colorGroup}
				</ColorGroup>
			))}
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