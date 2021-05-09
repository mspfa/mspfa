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

type StoriesAPI = APIClient<typeof import('pages/api/stories').default>;

const getRandomStoryName = () => (
	randomStoryNames[Math.floor(Math.random() * randomStoryNames.length)].map(
		possibilities => possibilities[Math.floor(Math.random() * possibilities.length)]
	).join('')
);

type ServerSideProps = {} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(() => (
	<Page flashyTitle heading="Your Adventures">
		<Box>
			<BoxRowSection heading="Adventures">
				<BoxRow>
					TODO
				</BoxRow>
			</BoxRowSection>
			<BoxFooter>
				<Button
					className="button"
					onClick={
						useCallback(async () => {
							const randomStoryName = getRandomStoryName();

							const dialog = new Dialog({
								id: 'new-story',
								title: 'New Adventure',
								initialValues: {
									name: ''
								},
								content: (
									<LabeledDialogBox>
										<BoxRow>What will the name of this new adventure be?</BoxRow>
										<FieldBoxRow
											name="name"
											label="Enter Name"
											autoFocus
											minLength={1}
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

							(api as StoriesAPI).post('/stories', {
								name: dialog.form!.values.name
							});
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
	const { statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);

	if (statusCode) {
		return { props: { statusCode } };
	}

	return {
		props: {}
	};
});