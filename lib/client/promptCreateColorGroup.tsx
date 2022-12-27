import ColorGroupOptions from 'components/ColorTool/ColorGroupOptions';
import Dialog from 'components/Dialog';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { PrivateStory } from 'lib/client/stories';
import type { Updater } from 'use-immer';
import type { ClientColorGroup } from 'lib/client/colors';
import Action from 'components/Dialog/Action';

type StoryColorGroupsAPI = APIClient<typeof import('pages/api/stories/[storyID]/color-groups').default>;

/**
 * Prompts the user to create a color group.
 *
 * Resolves with the newly created color group, or never resolves if none is created.
 */
const promptCreateColorGroup = (
	story: PrivateStory,
	updateStory: Updater<PrivateStory>
) => new Promise<ClientColorGroup>(async resolve => {
	const initialValues = { name: '' };

	type Values = typeof initialValues;
	const dialog = await Dialog.create<Values>(
		<Dialog
			id="color-group-options"
			title="Create Color Group"
			initialValues={initialValues}
		>
			<ColorGroupOptions />

			{Action.OKAY} {Action.CANCEL}
		</Dialog>
	);

	if (dialog.canceled) {
		return;
	}

	const { data: colorGroup } = await (api as StoryColorGroupsAPI).post(`/stories/${story.id}/color-groups`, {
		name: dialog.values.name
	});

	updateStory(story => {
		story.colorGroups.push(colorGroup);
	});

	resolve(colorGroup);
});

export default promptCreateColorGroup;
