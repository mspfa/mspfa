import BBField from 'components/BBCode/BBField';
import Button from 'components/Button';
import Label from 'components/Label';
import Row from 'components/Row';
import { PageIDContext, StoryViewerContext } from 'components/StoryViewer';
import type { FormikHelpers } from 'formik';
import { Formik, Form } from 'formik';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import { useLeaveConfirmation } from 'lib/client/forms';
import IDPrefix from 'lib/client/IDPrefix';
import useFunction from 'lib/client/useFunction';
import React, { useContext } from 'react';

type StoryPageCommentsAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments').default>;

const StoryComments = React.memo(() => {
	const { story } = useContext(StoryViewerContext)!;

	const pageID = useContext(PageIDContext);

	return (
		<IDPrefix.Provider value="story-comments">
			<Formik
				initialValues={{ content: '' }}
				onSubmit={
					useFunction(async (
						values: { content: string },
						formikHelpers: FormikHelpers<{ content: string }>
					) => {
						const { data: comment } = await (api as StoryPageCommentsAPI).post(`/stories/${story.id}/pages/${pageID}/comments`, {
							content: values.content
						});

						console.log(comment); // TODO: Render new comment.

						formikHelpers.setFieldValue('content', '');
					})
				}
			>
				{function StoryCommentsForm({ dirty, isSubmitting }) {
					useLeaveConfirmation(dirty);

					return (
						<Form className="row story-comments-form">
							<Label block htmlFor="story-comments-field-content">
								Post a Comment
							</Label>
							<BBField
								name="content"
								required
								maxLength={2000}
								rows={3}
								disabled={isSubmitting}
							/>
							<div className="story-comments-form-actions">
								<Button
									type="submit"
									className="small"
									disabled={isSubmitting}
								>
									Submit!
								</Button>
							</div>
						</Form>
					);
				}}
			</Formik>
			<Row className="story-comments">
				comments here
			</Row>
		</IDPrefix.Provider>
	);
});

export default StoryComments;