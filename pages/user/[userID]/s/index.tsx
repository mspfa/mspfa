import Page from 'components/Page';
import { Perm } from 'lib/client/perms';
import { permToGetUserInPage } from 'lib/server/permToGetUser';
import { withErrorPage } from 'lib/client/errors';
import { withStatusCode } from 'lib/server/errors';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import Row from 'components/Row';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Dialog from 'lib/client/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import randomStoryNames from 'lib/client/randomStoryNames.json';
import type { PrivateStory } from 'lib/client/stories';
import stories, { getPrivateStory } from 'lib/server/stories';
import List from 'components/List';
import StoryListing from 'components/StoryListing';
import Router from 'next/router';
import type { integer } from 'lib/types';

type StoriesAPI = APIClient<typeof import('pages/api/stories').default>;

const getRandomStoryName = () => (
	Math.random() < 1 / 1000
		? 'Help I\'m trapped in an adventure creation screen'
		: (
			randomStoryNames[Math.floor(Math.random() * randomStoryNames.length)].map(
				possibilities => possibilities[Math.floor(Math.random() * possibilities.length)]
			).join('')
		)
);

const promptNewStory = async () => {
	const randomStoryName = getRandomStoryName();

	const dialog = new Dialog({
		id: 'new-story',
		title: 'New Adventure',
		initialValues: {
			title: ''
		},
		content: (
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
		),
		actions: [
			{ label: 'Start!', autoFocus: false },
			'Cancel'
		]
	});

	if (!(await dialog)?.submit) {
		return;
	}

	const { data: privateStory } = await (api as StoriesAPI).post('/stories', {
		title: dialog.form!.values.title
	});

	Router.push(`/s/${privateStory.id}/edit`);
};

type ServerSideProps = {
	/** The stories owned by the private user. */
	privateStories: PrivateStory[]
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ privateStories }) => (
	<Page withFlashyTitle heading="Your Adventures">
		<Box>
			<BoxSection heading="Adventures">
				{(privateStories.length
					? (
						<List listing={StoryListing}>
							{privateStories.sort((a, b) => b.updated - a.updated)}
						</List>
					)
					: 'You haven\'t started any adventures yet! Click the button below to begin.'
				)}
			</BoxSection>
			<BoxFooter>
				<Button onClick={promptNewStory}>
					New Adventure!
				</Button>
			</BoxFooter>
		</Box>
	</Page>
));

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);

	if (statusCode) {
		return { props: { statusCode } };
	}

	return {
		props: {
			privateStories: await stories.find!({
				editors: user!._id,
				willDelete: { $exists: false }
			}).map(getPrivateStory).toArray()
		}
	};
});