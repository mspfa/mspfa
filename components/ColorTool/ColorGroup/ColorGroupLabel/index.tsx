import type { ClientColorGroup } from 'lib/client/colors';
import EditButton from 'components/Button/EditButton';
import Label from 'components/Label';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { APIClient } from 'lib/client/api';
import Dialog from 'lib/client/Dialog';
import api from 'lib/client/api';
import type { DragEvent } from 'react';
import { useContext } from 'react';
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';
import ColorGroupOptions from 'components/ColorTool/ColorGroupOptions';
import { getChangedValues } from 'lib/client/forms';
import Grabber from 'components/Grabber';

type StoryColorGroupAPI = APIClient<typeof import('pages/api/stories/[storyID]/colorGroups/[colorGroupID]').default>;

export type ColorGroupLabelProps = {
	children: ClientColorGroup
};

/** A `Label` representing a `ClientColorGroup` when saved colors are being edited. */
const ColorGroupLabel = ({ children: colorGroup }: ColorGroupLabelProps) => {
	const [story, setStory] = useContext(PrivateStoryContext)!;

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
							// Close any existing color group options dialog.
							await Dialog.getByID('color-group-options')?.resolve();

							const dialog = new Dialog({
								id: 'color-group-options',
								title: 'Edit Color Group',
								initialValues: {
									name: colorGroup.name
								},
								content: <ColorGroupOptions />,
								actions: [
									{ label: 'Delete', value: 'delete' },
									{ label: 'Save', submit: true, autoFocus: false },
									'Cancel'
								]
							});

							const dialogResult = await dialog;

							if (dialogResult?.value === 'delete') {
								if (!await Dialog.confirm({
									id: 'delete-color-group',
									title: 'Delete Color Group',
									content: (
										<>
											Are you sure you want to delete this color group?<br />
											<br />
											<i>{colorGroup.name}</i><br />
											<br />
											All colors in the group will remain without a group. This cannot be undone.
										</>
									)
								})) {
									return;
								}

								await (api as StoryColorGroupAPI).delete(`/stories/${story.id}/colorGroups/${colorGroup.id}`);

								setStory(story => {
									const colorGroupIndex = story.colorGroups.findIndex(({ id }) => id === colorGroup.id);

									return {
										...story,
										colorGroups: [
											...story.colorGroups.slice(0, colorGroupIndex),
											...story.colorGroups.slice(colorGroupIndex + 1, story.colorGroups.length)
										],
										colors: story.colors.map(({ group, ...color }) => ({
											...color,
											// Only keep the color's group if the color wasn't in the group being deleted.
											...group !== colorGroup.id && {
												group
											}
										}))
									};
								});

								return;
							}

							if (!dialogResult?.submit) {
								return;
							}

							const changedValues = getChangedValues(dialog.form!.initialValues, dialog.form!.values);

							if (!changedValues) {
								return;
							}

							const { data: newColorGroup } = await (api as StoryColorGroupAPI).patch(`/stories/${story.id}/colorGroups/${colorGroup.id}`, changedValues);

							setStory(story => {
								const colorGroupIndex = story.colorGroups.findIndex(({ id }) => id === colorGroup.id);

								return {
									...story,
									colorGroups: [
										...story.colorGroups.slice(0, colorGroupIndex),
										newColorGroup,
										...story.colorGroups.slice(colorGroupIndex + 1, story.colorGroups.length)
									]
								};
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