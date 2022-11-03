import ColorGroupOptions from 'components/ColorTool/ColorGroupOptions';
import Dialog from 'lib/client/Dialog';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { PrivateStory } from 'lib/client/stories';
import type { Updater } from 'use-immer';
import type { ClientColorGroup } from 'lib/client/colors';

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
	// Close any existing color options dialog.
	await Dialog.getByID('color-group-options')?.resolve();

	const dialog = new Dialog({
		id: 'color-group-options',
		title: 'Create Color Group',
		initialValues: { name: '' },
		content: <ColorGroupOptions />,
		actions: [
			{ label: 'Okay', autoFocus: false },
			'Cancel'
		]
	});

	if (!(await dialog)?.submit) {
		return;
	}

	const { data: colorGroup } = await (api as StoryColorGroupsAPI).post(`/stories/${story.id}/color-groups`, {
		name: dialog.form!.values.name
	});

	updateStory(story => {
		story.colorGroups.push(colorGroup);
	});

	resolve(colorGroup);
});

export default promptCreateColorGroup;
