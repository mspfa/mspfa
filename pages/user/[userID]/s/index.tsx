import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { permToGetUserInPage } from 'modules/server/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Box from 'components/Box';
import BoxRowSection from 'components/Box/BoxRowSection';
import BoxRow from 'components/Box/BoxRow';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import { useCallback } from 'react';
import type { APIClient } from 'modules/client/api';
import api from 'modules/client/api';
import { Dialog } from 'modules/client/dialogs';
import LabeledDialogBox from 'components/Box/LabeledDialogBox';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import randomStoryNames from 'modules/client/randomStoryNames.json';
import type { PrivateStory } from 'modules/client/stories';
import stories, { getPrivateStory } from 'modules/server/stories';
import List from 'components/List';
import StoryListing from 'components/StoryListing';
import Router from 'next/router';

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

type ServerSideProps = {
	/** The stories owned by the private user. */
	privateStories: PrivateStory[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ privateStories }) => (
	<Page flashyTitle heading="Your Adventures">
		<Box>
			<BoxRowSection heading="Adventures">
				<BoxRow>
					{(privateStories.length
						? (
							<List listing={StoryListing}>
								{privateStories.sort((a, b) => b.updated - a.updated)}
							</List>
						)
						: 'You haven\'t started any adventures yet! Click the button below to begin.'
					)}
				</BoxRow>
			</BoxRowSection>
			<BoxFooter>
				<Button
					onClick={
						useCallback(async () => {
							const randomStoryName = getRandomStoryName();

							const dialog = new Dialog({
								id: 'new-story',
								title: 'New Adventure',
								initialValues: {
									title: ''
								},
								content: (
									<LabeledDialogBox>
										<BoxRow>What will the title of this new adventure be?</BoxRow>
										<FieldBoxRow
											name="title"
											label="Enter Title"
											required
											autoFocus
											maxLength={50}
											placeholder={randomStoryName}
											size={Math.max(20, randomStoryName.length)}
											autoComplete="off"
										/>
									</LabeledDialogBox>
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
						}, [])
					}
				>
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