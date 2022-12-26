import type { ClientColorGroup } from 'lib/client/colors';
import EditButton from 'components/Button/EditButton';
import Label from 'components/Label';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { APIClient } from 'lib/client/api';
import Dialog from 'components/Dialog';
import api from 'lib/client/api';
import type { DragEvent } from 'react';
import { useContext } from 'react';
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';
import ColorGroupOptions from 'components/ColorTool/ColorGroupOptions';
import { getChangedValues } from 'lib/client/forms';
import Grabber from 'components/Grabber';
import Action from 'components/Dialog/Action';

type StoryColorGroupAPI = APIClient<typeof import('pages/api/stories/[storyID]/color-groups/[colorGroupID]').default>;

export type ColorGroupLabelProps = {
	children: ClientColorGroup
};

/** A `Label` representing a `ClientColorGroup` when saved colors are being edited. */
const ColorGroupLabel = ({ children: colorGroup }: ColorGroupLabelProps) => {
	const [story, updateStory] = useContext(PrivateStoryContext)!;

	return (
		<Label
			block
			beforeLabel={(
				<Grabber
					className="spaced"
					onDragStart={
						useFunction((
							event: DragEvent<HTMLDivElement> & { target: HTMLDivElement & { parentNode: HTMLDivElement } }
						) => {
							event.dataTransfer.effectAllowed = 'move';

							const dragImageRect = event.target.parentNode.getBoundingClientRect();
							event.dataTransfer.setDragImage(
								event.target.parentNode as HTMLDivElement,
								event.clientX - dragImageRect.left,
								event.clientY - dragImageRect.top
							);
						})
					}
				/>
			)}
			afterLabel={(
				<EditButton
					className="spaced"
					title="Edit Color Group"
					onClick={
						useFunction(async () => {
							const initialValues = {
								name: colorGroup.name
							};

							type Values = typeof initialValues;
							type Action = 'delete';
							const dialog = await Dialog.create<Values, Action>(
								<Dialog id="color-group-options" title="Edit Color Group">
									<ColorGroupOptions />
									<Action cancel value="delete">Delete</Action>
									<Action>Save</Action>
									{Action.CANCEL}
								</Dialog>
							);

							if (dialog.action === 'delete') {
								if (!await Dialog.confirm(
									<Dialog id="delete-color-group" title="Delete Color Group">
										Are you sure you want to delete this color group?<br />
										<br />
										<i>{colorGroup.name}</i><br />
										<br />
										All colors in the group will remain without a group. This cannot be undone.
									</Dialog>
								)) {
									return;
								}

								await (api as StoryColorGroupAPI).delete(`/stories/${story.id}/color-groups/${colorGroup.id}`);

								updateStory(story => {
									const colorGroupIndex = story.colorGroups.findIndex(({ id }) => id === colorGroup.id);

									story.colorGroups.splice(colorGroupIndex, 1);

									for (const color of story.colors) {
										if (color.group === colorGroup.id) {
											delete color.group;
										}
									}
								});

								return;
							}

							if (dialog.canceled) {
								return;
							}

							const changedValues = getChangedValues(dialog.initialValues, dialog.values);

							if (!changedValues) {
								return;
							}

							const { data: newColorGroup } = await (api as StoryColorGroupAPI).patch(
								`/stories/${story.id}/color-groups/${colorGroup.id}`,
								changedValues
							);

							updateStory(story => {
								const colorGroupIndex = story.colorGroups.findIndex(({ id }) => id === colorGroup.id);

								story.colorGroups[colorGroupIndex] = newColorGroup;
							});
						})
					}
				/>
			)}
		>
			{colorGroup.name}
		</Label>
	);
};

export default ColorGroupLabel;
