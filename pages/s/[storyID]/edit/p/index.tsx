import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik } from 'formik';
import { useCallback, useState } from 'react';
import { useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import { getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { PrivateStory } from 'modules/client/stories';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'modules/client/api';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;

const getValuesFromStory = (privateStory: PrivateStory) => ({

});

type Values = ReturnType<typeof getValuesFromStory>;

type ServerSideProps = {
	privateStory: PrivateStory
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ privateStory: initialPrivateStory }) => {
	const [privateStory, setPrivateStory] = useState(initialPrivateStory);

	const initialValues = getValuesFromStory(privateStory);

	return (
		<Page heading="Edit Adventure">
			<Formik
				initialValues={initialValues}
				onSubmit={
					useCallback(async (values: Values) => {

					}, [])
				}
				enableReinitialize
			>
				{({ isSubmitting, dirty }) => {
					useLeaveConfirmation(dirty);

					return (
						<Form>
							<Box>
								<BoxSection heading={privateStory.title}>
									hello world
								</BoxSection>
								<BoxFooter>
									<Button href={`/s/${privateStory.id}/edit`}>
										Edit Adventure
									</Button>
									<Button
										type="submit"
										className="alt"
										disabled={!dirty || isSubmitting}
									>
										Save
									</Button>
								</BoxFooter>
							</Box>
							<Box id="story-page-box">
								<BoxSection className="story-page-section" heading="Page 2">
									awdawdawdawda
								</BoxSection>
								<BoxSection className="story-page-section" heading="Page 1">
									awdawdawdawda
								</BoxSection>
								<BoxFooter>
									<Button>
										More
									</Button>
								</BoxFooter>
							</Box>
						</Form>
					);
				}}
			</Formik>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	if (!(
		story && req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	return {
		props: {
			privateStory: getPrivateStory(story)
		}
	};
});