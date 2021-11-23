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
import type { integer } from 'lib/types';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';

type StoryColorGroupAPI = APIClient<typeof import('pages/api/stories/[storyID]/colorGroups/[colorGroupID]').default>;
type StoryColorAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors/[colorID]').default>;

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
	/** A ref to the nearest position to drop the dragged color or color group into, or `undefined` if the position should not be changed on drop. */
	const dropPositionRef = useRef<integer>();
	/** A ref to the ID of the nearest group to drop the dragged color into, or `undefined` if its group should be removed on drop. */
	const dropGroupRef = useRef<string>();

	const savedColorsElementRef = useRef<HTMLDivElement>(null!);

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
					dropPositionRef.current = undefined;
					dropGroupRef.current = undefined;
				})
			}
			onDragOver={
				useFunction((event: DragEvent<HTMLDivElement>) => {
					if (!draggingGrabberRef.current) {
						return;
					}

					event.preventDefault();

					event.dataTransfer.dropEffect = 'move';

					const { clientY } = event;
					/** The smallest vertical distance between the cursor and a possible drop position. */
					let minDistance = Infinity;

					if (event.dataTransfer.types.includes('application/vnd.mspfa.color-group-index')) {
						dropPositionRef.current = 0;

						for (const colorGroupElement of savedColorsElementRef.current.getElementsByClassName('color-group')) {
							if (
								// Dropping to the position immediately before the color group being dragged should end up in the same position as the one immediately after the color group being dragged, so the color group being dragged should not affect the drop position.
								colorGroupElement.getElementsByClassName('dragging').length
								// Ignore the group of colors with no group, since it doesn't actually have any position in the color group array.
								|| colorGroupElement.id === 'color-group-undefined'
							) {
								continue;
							}

							const colorGroupElementRect = colorGroupElement.getBoundingClientRect();

							// Compare the cursor's position to the top of this color group element.
							let distance = Math.abs(clientY - colorGroupElementRect.top);
							if (distance <= minDistance) {
								minDistance = distance;
							} else {
								break;
							}

							// Compare the cursor's position to the bottom of this color group element.
							distance = Math.abs(clientY - colorGroupElementRect.bottom);
							if (distance <= minDistance) {
								minDistance = distance;

								// The cursor is closer to the bottom than it is to the top, so make the drop position one unit lower.
								dropPositionRef.current++;
							} else {
								break;
							}
						}

						return;
					}

					if (event.dataTransfer.types.includes('application/vnd.mspfa.color-index')) {
						/** The smallest vertical distance between the cursor and a possible color group to drop the color into. */
						let minGroupDistance = Infinity;
						let nearestColorGroupColorsElement: Element;

						for (const colorGroupColorsElement of savedColorsElementRef.current.getElementsByClassName('color-group-colors')) {
							const colorGroupColorsElementRect = colorGroupColorsElement.getBoundingClientRect();

							// Compare the cursor's position to the top of this color group colors element.
							let distance = Math.abs(clientY - colorGroupColorsElementRect.top);
							if (distance <= minGroupDistance) {
								minGroupDistance = distance;

								nearestColorGroupColorsElement = colorGroupColorsElement;
							} else {
								break;
							}

							// Compare the cursor's position to the bottom of this color group colors element.
							distance = Math.abs(clientY - colorGroupColorsElementRect.bottom);
							if (distance <= minGroupDistance) {
								minGroupDistance = distance;
							} else {
								break;
							}
						}

						dropGroupRef.current = (
							nearestColorGroupColorsElement!.parentNode as HTMLDivElement
						).id.slice('color-group-'.length);
						if (dropGroupRef.current === 'undefined') {
							// If dropping into the group of colors with no group, remove the color's group on drop.
							dropGroupRef.current = undefined;
						}

						// Keep the color's position the same by default.
						dropPositionRef.current = undefined;

						for (const colorContainerElement of nearestColorGroupColorsElement!.getElementsByClassName('color-container')) {
							const colorContainerElementRect = colorContainerElement.getBoundingClientRect();

							// Compare the cursor's position to the top of this color container.
							let distance = Math.abs(clientY - colorContainerElementRect.top);
							// This comparison must use `<=` instead of `<`, because the top of one color container could be at the exact same position as the bottom of the previous one.
							if (distance <= minDistance) {
								minDistance = distance;

								const colorID = colorContainerElement.id.slice('color-container-'.length);
								dropPositionRef.current = story.colors.findIndex(({ id }) => id === colorID);
							} else {
								break;
							}

							// Compare the cursor's position to the bottom of this color container.
							distance = Math.abs(clientY - colorContainerElementRect.bottom);
							if (distance <= minDistance) {
								minDistance = distance;

								// The cursor is closer to the bottom than it is to the top, so make the drop position one unit lower.
								dropPositionRef.current++;
							} else {
								break;
							}
						}

						if (dropPositionRef.current !== undefined) {
							/** The ID of the color being dragged. */
							const draggingColorID = (
								savedColorsElementRef.current.getElementsByClassName('dragging')[0].parentNode as HTMLDivElement
							).id.slice('color-container-'.length);
							/** The index of the color being dragged. */
							const draggingColorIndex = story.colors.findIndex(({ id }) => id === draggingColorID);

							// Adjust the drop position in consideration of the fact that the color being dragged is removed from the array before being inserted at the new position.
							if (dropPositionRef.current > draggingColorIndex) {
								dropPositionRef.current--;
							}
						}
					}
				})
			}
			onDrop={
				useFunction(async (event: DragEvent<HTMLDivElement>) => {
					event.preventDefault();

					const colorGroupIndexString = event.dataTransfer.getData('application/vnd.mspfa.color-group-index');
					if (colorGroupIndexString) {
						const colorGroupIndex = +colorGroupIndexString;
						const colorGroup = story.colorGroups[colorGroupIndex];
						const position = dropPositionRef.current ?? colorGroupIndex;

						// Only change the color group's position if it isn't already in that position.
						if (colorGroupIndex === position) {
							return;
						}

						const { data: newColorGroup } = await (api as StoryColorGroupAPI).patch(`/stories/${story.id}/colorGroups/${colorGroup.id}`, {
							position
						});

						setStory(story => {
							const newStory = {
								...story,
								colorGroups: [
									...story.colorGroups.slice(0, colorGroupIndex),
									// Don't include the original color group.
									...story.colorGroups.slice(colorGroupIndex + 1, story.colorGroups.length)
								]
							};

							// Insert the new color group at the new position.
							newStory.colorGroups.splice(position, 0, newColorGroup);

							return newStory;
						});

						return;
					}

					const colorIndexString = event.dataTransfer.getData('application/vnd.mspfa.color-index');
					if (colorIndexString) {
						const colorIndex = +colorIndexString;
						const color = story.colors[colorIndex];
						const position = dropPositionRef.current ?? colorIndex;

						const changedPosition = colorIndex !== position;
						const changedGroup = color.group !== dropGroupRef.current;

						// Only change the color's position or group if it isn't already in that position and group.
						if (!(changedPosition || changedGroup)) {
							return;
						}

						const { data: newColor } = await (api as StoryColorAPI).patch(`/stories/${story.id}/colors/${color.id}`, {
							...changedPosition && { position },
							...changedGroup && {
								group: dropGroupRef.current || null
							}
						});

						setStory(story => {
							const newStory = {
								...story,
								colors: [
									...story.colors.slice(0, colorIndex),
									// Don't include the original color.
									...story.colors.slice(colorIndex + 1, story.colors.length)
								]
							};

							// Insert the new color at the new position.
							newStory.colors.splice(position, 0, newColor);

							return newStory;
						});
					}
				})
			}
			ref={savedColorsElementRef}
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
					This Adventure's Saved Colors
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