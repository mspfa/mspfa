import './styles.module.scss';
import type { DragEvent } from 'react';
import React, { useContext, useState, useRef } from 'react';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';
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
import type { ClientColorGroup } from 'lib/client/colors';
import DropIndicator from 'components/ColorTool/DropIndicator';
import classNames from 'classnames';

type StoryColorGroupAPI = APIClient<typeof import('pages/api/stories/[storyID]/color-groups/[colorGroupID]').default>;
type StoryColorAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors/[colorID]').default>;

/** A symbol that represents where a `DropIndicator` should be rendered. */
export const dropIndicator = Symbol('dropIndicator');

export type SavedColorsProps = Pick<ColorProps, 'name'>;

/** The saved colors section of `ColorTool`. */
const SavedColors = React.memo(({ name }: SavedColorsProps) => {
	const [story, updateStory] = useContext(PrivateStoryContext)!;

	const [editing, setEditing] = useState(false);

	const toggleEditing = useFunction(() => {
		setEditing(editing => !editing);
	});

	const onClickCreateColorGroup = useFunction(() => {
		promptCreateColorGroup(story, updateStory);
	});

	// This state is whether a color or color group is currently being dragged.
	const [dragging, setDragging] = useState<false | 'color' | 'color-group'>(false);
	// This state is the index of the color or color group being dragged.
	const [draggingIndex, setDraggingIndex] = useState<integer>();
	// This state is the nearest index to drop the dragged color or color group at.
	const [dropIndex, setDropIndex] = useState<integer>();
	// This state is the ID of the nearest group to drop the dragged color into, or `undefined` if its group should be removed on drop.
	const [dropGroup, setDropGroup] = useState<ClientColorGroup['id']>();
	/** The index in the `colors` or `colorGroups` array at which a drop indicator should be inserted. */
	const dropIndicatorIndex = (
		dropIndex === undefined
			? undefined
			// Adjust the `dropIndex` to consider the item being dragged as still within the array.
			: dropIndex > draggingIndex!
				? dropIndex + 1
				: dropIndex
	);

	const savedColorsElementRef = useRef<HTMLDivElement>(null);

	/** A function called on `dragenter` or `dragover` the saved colors element. */
	const dragEventHandler = useFunction((event: DragEvent<HTMLDivElement>) => {
		if (!dragging) {
			return;
		}

		event.preventDefault();

		event.dataTransfer.dropEffect = 'move';

		const { clientY } = event;
		/** The smallest vertical distance between the cursor and a possible drop index. */
		// Distance comparisons must use `<=` instead of `<`, because otherwise, the top of one element being at the same index as the bottom of the previous one would `break` the comparison loop.
		let minDistance = Infinity;
		let newDropIndex;

		if (dragging === 'color-group') {
			// Start at the top index, since the below loop works by starting from the top and incrementing the index for each color group which is closer to the cursor.
			newDropIndex = 0;

			for (const colorGroupElement of savedColorsElementRef.current!.getElementsByClassName('color-group')) {
				// Ignore the group of colors with no group, since it doesn't actually have any index in the color group array.
				if (colorGroupElement.id === 'color-group-undefined') {
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

					// The cursor is closer to the bottom than it is to the top, so make the drop index one unit lower.
					newDropIndex++;
				} else {
					break;
				}
			}
		} else {
			dragging satisfies 'color';

			// Keep the initial index.
			newDropIndex = draggingIndex!;
			/** The smallest vertical distance between the cursor and a possible color group to drop the color into. */
			let minGroupDistance = Infinity;
			let nearestColorGroupColorsElement: Element;

			for (const colorGroupColorsElement of savedColorsElementRef.current!.getElementsByClassName('color-group-colors')) {
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

			let newDropGroup: typeof dropGroup = (
				nearestColorGroupColorsElement!.parentNode as HTMLDivElement
			).id.slice('color-group-'.length);
			if (newDropGroup === 'undefined') {
				// If dropping into the group of colors with no group, remove the color's group on drop.
				newDropGroup = undefined;
			}

			if (newDropGroup !== dropGroup) {
				setDropGroup(newDropGroup);
			}

			for (const colorContainerElement of nearestColorGroupColorsElement!.getElementsByClassName('color-container')) {
				const colorContainerElementRect = colorContainerElement.getBoundingClientRect();

				// Compare the cursor's position to the top of this color container.
				let distance = Math.abs(clientY - colorContainerElementRect.top);
				if (distance <= minDistance) {
					minDistance = distance;

					const colorID = colorContainerElement.id.slice('color-container-'.length);
					newDropIndex = story.colors.findIndex(({ id }) => id === colorID);
				} else {
					break;
				}

				// Compare the cursor's position to the bottom of this color container.
				distance = Math.abs(clientY - colorContainerElementRect.bottom);
				if (distance <= minDistance) {
					minDistance = distance;

					// The cursor is closer to the bottom than it is to the top, so make the drop index one unit lower.
					newDropIndex++;
				} else {
					break;
				}
			}
		}

		// Adjust the drop index in consideration of the fact that the item being dragged is removed from the array before being inserted at the new index.
		if (newDropIndex > draggingIndex!) {
			newDropIndex--;
		}

		if (newDropIndex !== dropIndex!) {
			setDropIndex(newDropIndex);
		}
	});

	const colorGroups: Array<ClientColorGroup | undefined | typeof dropIndicator> = [
		...story.colorGroups,
		// This is to render the colors without a `group`.
		undefined
	];
	if (dragging === 'color-group') {
		colorGroups.splice(dropIndicatorIndex!, 0, dropIndicator);
	}

	const SavedColorsComponent = editing ? 'div' : LabeledGrid;

	return (
		<SavedColorsComponent
			id="saved-colors"
			className={classNames({ editing })}
			onDragStart={
				useFunction((event: DragEvent) => {
					if (!(event.target as HTMLElement).classList.contains('grabber')) {
						return;
					}

					// Without this timeout, the state update often causes the dragging to immediately end.
					setTimeout(() => {
						const grabber = savedColorsElementRef.current?.getElementsByClassName('grabber dragging')[0] as (
							undefined
							| (HTMLDivElement & { parentNode: HTMLDivElement & { parentNode: HTMLDivElement } })
						);

						if (!grabber) {
							return;
						}

						if (grabber.parentNode.classList.contains('color-container')) {
							const draggingColorID = grabber.parentNode.id.slice('color-container-'.length);
							const newDraggingIndex = story.colors.findIndex(({ id }) => id === draggingColorID);
							setDraggingIndex(newDraggingIndex);
							setDropIndex(newDraggingIndex);
							setDropGroup(story.colors[newDraggingIndex].group);
							setDragging('color');
						} else if (grabber.parentNode.parentNode.classList.contains('color-group')) {
							const draggingColorGroupID = grabber.parentNode.parentNode.id.slice('color-group-'.length);
							const newDraggingIndex = story.colorGroups.findIndex(({ id }) => id === draggingColorGroupID);
							setDraggingIndex(newDraggingIndex);
							setDropIndex(newDraggingIndex);
							setDragging('color-group');
						}
					});
				})
			}
			onDragEnd={
				useFunction(() => {
					setDragging(false);
					setDraggingIndex(undefined);
					setDropIndex(undefined);
					setDropGroup(undefined);
				})
			}
			// It is necessary to listen to `dragenter` in addition to `dragover`, because the `dragover` event doesn't always get canceled in time for the `drop` event to fire.
			onDragEnter={dragEventHandler}
			onDragOver={dragEventHandler}
			onDrop={
				useFunction(async (event: DragEvent<HTMLDivElement>) => {
					if (!dragging) {
						return;
					}

					event.preventDefault();

					if (dragging === 'color-group') {
						const colorGroup = story.colorGroups[draggingIndex!];

						// Only change the color group's index if it isn't already in that index.
						if (draggingIndex! === dropIndex!) {
							return;
						}

						const { data: newColorGroup } = await (api as StoryColorGroupAPI).patch(`/stories/${story.id}/color-groups/${colorGroup.id}`, {
							index: dropIndex!
						});

						updateStory(story => {
							story.colorGroups.splice(draggingIndex!, 1);
							story.colorGroups.splice(dropIndex!, 0, newColorGroup);
						});

						return;
					}

					dragging satisfies 'color';

					const color = story.colors[draggingIndex!];

					const changedIndex = draggingIndex! !== dropIndex!;
					const changedGroup = color.group !== dropGroup;

					// Only change the color's index or group if it isn't already in that index and group.
					if (!(changedIndex || changedGroup)) {
						return;
					}

					const { data: newColor } = await (api as StoryColorAPI).patch(`/stories/${story.id}/colors/${color.id}`, {
						...changedIndex && {
							index: dropIndex!
						},
						...changedGroup && {
							group: dropGroup || null
						}
					});

					updateStory(story => {
						story.colorGroups.splice(draggingIndex!, 1);
						story.colorGroups.splice(dropIndex!, 0, newColor);
					});
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
			{colorGroups.map(colorGroup => (
				colorGroup === dropIndicator ? (
					<DropIndicator key="drop-indicator" />
				) : (
					<ColorGroup
						key={String(colorGroup?.id)}
						name={name}
						editing={editing}
						dropIndicatorIndex={
							dragging === 'color' && colorGroup?.id === dropGroup
								? dropIndicatorIndex!
								: undefined
						}
					>
						{colorGroup}
					</ColorGroup>
				)
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
