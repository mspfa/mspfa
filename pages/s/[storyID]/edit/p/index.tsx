import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'modules/client/perms';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import { Form, Formik } from 'formik';
import { useCallback, useRef, useState } from 'react';
import { useLeaveConfirmation } from 'modules/client/forms';
import Box from 'components/Box';
import Button from 'components/Button';
import { getPrivateStory, getStoryByUnsafeID } from 'modules/server/stories';
import type { PrivateStory } from 'modules/client/stories';
import BoxSection from 'components/Box/BoxSection';
import type { APIClient } from 'modules/client/api';
import Row from 'components/Row';

type StoryAPI = APIClient<typeof import('pages/api/stories/[storyID]').default>;

const getValuesFromStory = (privateStory: PrivateStory) => ({
	pages: []
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

	const notifyCheckboxRef = useRef<HTMLInputElement>(null!);

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
								<BoxSection
									id="editor-options"
									heading={privateStory.title}
								>
									<Row>
										<Button
											className="small"
											href={`/s/${privateStory.id}/edit`}
										>
											Edit Adventure
										</Button>
										<Button className="small">Jump to Page</Button>
										<Button className="small">Find and Replace</Button>
									</Row>
									<Row>
										<label>
											<input
												type="checkbox"
												className="spaced"
												ref={notifyCheckboxRef}
											/>
											<span className="spaced">
												Notify readers of newly published pages during this editing session
											</span>
										</label>
									</Row>
								</BoxSection>
							</Box>
							<Row id="story-page-actions">
								<Button>
									New Page
								</Button>
								<Button
									type="submit"
									className="alt"
									disabled={!dirty || isSubmitting}
								>
									Save All
								</Button>
								<Button
									className="alt"
									disabled={true || dirty || isSubmitting}
								>
									Publish
								</Button>
							</Row>
							<Box id="story-page-box">
								<Row id="story-page-sections">
									<BoxSection
										className="story-page-section"
										heading="Page 2"
									>
										awdawdawdawda
									</BoxSection>
									<BoxSection
										className="story-page-section"
										heading="Page 1"
									>
										awdawdawdawda
									</BoxSection>
								</Row>
								<Row id="story-page-view-actions">
									<Button>
										More
									</Button>
								</Row>
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