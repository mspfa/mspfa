import './styles.module.scss';
import BBField from 'components/BBCode/BBField';
import Button from 'components/Button';
import Label from 'components/Label';
import Row from 'components/Row';
import { PageIDContext, StoryViewerContext } from 'components/StoryViewer';
import type { FormikHelpers } from 'formik';
import { Formik, Form } from 'formik';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Dialog from 'lib/client/Dialog';
import { useLeaveConfirmation } from 'lib/client/forms';
import IDPrefix from 'lib/client/IDPrefix';
import useFunction from 'lib/client/useFunction';
import { promptSignIn, useUser } from 'lib/client/users';
import type { ChangeEvent } from 'react';
import React, { useContext, useRef, useState } from 'react';
import type { StoryCommentsSortMode } from 'pages/api/stories/[storyID]/comments';
import useComments from 'lib/client/useComments';
import StoryPageComment from 'components/Comment/StoryPageComment';

type StoryCommentsAPI = APIClient<typeof import('pages/api/stories/[storyID]/comments').default>;
type StoryPageCommentsAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments').default>;

const StoryComments = React.memo(() => {
	const { story } = useContext(StoryViewerContext)!;

	const pageID = useContext(PageIDContext);

	const user = useUser();

	const [sortMode, setSortMode] = useState<StoryCommentsSortMode>('pageID');

	const {
		comments,
		setComments,
		setNotAllCommentsLoaded,
		commentsElementRef,
		setComment,
		deleteComment
	} = useComments<StoryCommentsAPI>(`/stories/${story.id}/comments`, {
		params: {
			fromPageID: pageID,
			sort: sortMode
		}
	});

	/** Empties the `comments` so they can be loaded again. */
	const resetComments = () => {
		setComments([]);
		setNotAllCommentsLoaded(true);
	};

	const previousPageIDRef = useRef(pageID);

	// Reset comments whenever the page changes.
	if (previousPageIDRef.current !== pageID) {
		resetComments();

		previousPageIDRef.current = pageID;
	}

	return (
		<IDPrefix.Provider value="story-comment">
			<Formik
				initialValues={{ content: '' }}
				onSubmit={
					useFunction(async (
						values: { content: string },
						formikHelpers: FormikHelpers<{ content: string }>
					) => {
						if (!user) {
							if (await Dialog.confirm({
								id: 'post-comment',
								title: 'StoryPageComment',
								content: 'Sign in to post a comment!',
								actions: ['Sign In', 'Cancel']
							})) {
								promptSignIn();
							}

							return;
						}

						const { data: newComment } = await (api as StoryPageCommentsAPI).post(`/stories/${story.id}/pages/${pageID}/comments`, {
							content: values.content
						});

						// Add the new comment to the top (regardless of the sort mode).
						setComments([
							newComment,
							...comments
						]);

						formikHelpers.setFieldValue('content', '');
					})
				}
			>
				{function StoryCommentForm({ dirty, isSubmitting }) {
					useLeaveConfirmation(dirty);

					return (
						<Form className="row story-comment-form">
							<Label block htmlFor="story-comment-field-content">
								Post a StoryPageComment
							</Label>
							<BBField
								name="content"
								required
								maxLength={2000}
								rows={3}
								disabled={isSubmitting}
							/>
							<div className="story-comment-form-actions">
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
			<Row className="story-comment-options">
				<div className="story-comment-option">
					<Label className="spaced" htmlFor="story-comment-field-sort-mode">
						Sort By
					</Label>
					<select
						id="story-comment-field-sort-mode"
						className="spaced"
						value={sortMode}
						onChange={
							useFunction((event: ChangeEvent<HTMLSelectElement>) => {
								setSortMode(event.target.value as StoryCommentsSortMode);
								resetComments();
							})
						}
					>
						<option value="pageID">Page Number</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
						<option value="liked">Rating</option>
					</select>
				</div>
			</Row>
			<Row
				className="story-comments"
				ref={commentsElementRef}
			>
				{comments.map(comment => (
					<StoryPageComment
						key={comment.id}
						story={story}
						setComment={setComment}
						deleteComment={deleteComment}
					>
						{comment}
					</StoryPageComment>
				))}
			</Row>
		</IDPrefix.Provider>
	);
});

export default StoryComments;