import Page from 'components/Page';
import Perm from 'lib/client/Perm';
import { permToGetUserInPage } from 'lib/server/users/permToGetUser';
import { withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import Section from 'components/Section';
import Row from 'components/Row';
import BottomActions from 'components/BottomActions';
import Button from 'components/Button';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Dialog from 'components/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import randomStoryNames from 'lib/client/randomStoryNames.json';
import type { PublicStory } from 'lib/client/stories';
import stories, { getPublicStory } from 'lib/server/stories';
import List from 'components/List';
import StoryListing from 'components/StoryListing';
import Router from 'next/router';
import type { integer } from 'lib/types';
import Action from 'components/Dialog/Action';

type StoriesAPI = APIClient<typeof import('pages/api/stories').default>;

const getRandomStoryName = () => {
	if (Math.random() < 1 / 1000) {
		return 'Help I\'m trapped in an adventure creation screen';
	}

	const phraseListsIndex = Math.floor(Math.random() * randomStoryNames.length);
	const phraseLists = randomStoryNames[phraseListsIndex]!;

	return phraseLists.map(
		phrases => phrases[Math.floor(Math.random() * phrases.length)]!
	).join('');
};

const promptNewStory = async () => {
	const randomStoryName = getRandomStoryName();

	const initialValues = {
		title: ''
	};

	type Values = typeof initialValues;
	const dialog = await Dialog.create<Values>(
		<Dialog
			id="new-story"
			title="New Adventure"
			initialValues={initialValues}
		>
			<LabeledGrid>
				<Row>What will the title of this new adventure be?</Row>
				<LabeledGridField
					name="title"
					label="Enter Title"
					required
					autoFocus
					maxLength={50}
					placeholder={randomStoryName}
					size={Math.max(20, randomStoryName.length)}
					autoComplete="off"
				/>
			</LabeledGrid>

			<Action>Start!</Action>
			{Action.CANCEL}
		</Dialog>
	);

	if (dialog.canceled) {
		return;
	}

	const { data: story } = await (api as StoriesAPI).post('/stories', {
		title: dialog.values.title
	});

	Router.push(`/stories/${story.id}/edit`);
};

type ServerSideProps = {
	/** The stories owned by the private user. */
	stories: PublicStory[]
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ stories }) => (
	<Page withFlashyTitle heading="Your Adventures">
		<Section heading="Adventures">
			{(stories.length
				? (
					<List listing={StoryListing}>
						{stories.sort((a, b) => b.updated - a.updated)}
					</List>
				)
				: 'You haven\'t started any adventures yet! Click the button below to begin.'
			)}
		</Section>
		<BottomActions>
			<Button onClick={promptNewStory}>
				New Adventure!
			</Button>
		</BottomActions>
	</Page>
));

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.READ);

	if (statusCode) {
		return { props: { statusCode } };
	}

	return {
		props: {
			stories: await stories.find!({
				editors: user!._id,
				willDelete: { $exists: false }
			}).map(getPublicStory).toArray()
		}
	};
});
