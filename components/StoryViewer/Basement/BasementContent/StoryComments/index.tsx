import './styles.module.scss';
import BBField from 'components/BBCode/BBField';
import Button from 'components/Button';
import Comment from 'components/Comment';
import Label from 'components/Label';
import Row from 'components/Row';
import { PageIDContext, StoryViewerContext } from 'components/StoryViewer';
import type { FormikHelpers } from 'formik';
import { Formik, Form } from 'formik';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { ClientComment } from 'lib/client/comments';
import Dialog from 'lib/client/Dialog';
import { useLeaveConfirmation } from 'lib/client/forms';
import frameThrottler from 'lib/client/frameThrottler';
import IDPrefix from 'lib/client/IDPrefix';
import useFunction from 'lib/client/useFunction';
import { useUserCache } from 'lib/client/UserCache';
import { promptSignIn, useUser } from 'lib/client/users';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import React, { useContext, useEffect, useRef, useState } from 'react';

type StoryCommentsAPI = APIClient<typeof import('pages/api/stories/[storyID]/comments').default>;
type StoryPageCommentsAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments').default>;

/** The maximum number of comments to request each time. */
const COMMENTS_PER_REQUEST = 10;

const StoryComments = React.memo(() => {
	const { story } = useContext(StoryViewerContext)!;

	const pageID = useContext(PageIDContext);

	const { cacheUser } = useUserCache();

	const user = useUser();

	const [comments, setComments] = useState<ClientComment[]>([]);

	const [notAllCommentsLoaded, setNotAllCommentsLoaded] = useState(true);
	/** A ref to whether comments are currently being requested. */
	const loadingCommentsRef = useRef(false);
	const commentsElementRef = useRef<HTMLDivElement>(null!);

	const checkIfCommentsShouldBeFetched = useFunction(async () => {
		if (loadingCommentsRef.current) {
			return;
		}

		const commentsRect = commentsElementRef.current.getBoundingClientRect();
		const commentsStyle = window.getComputedStyle(commentsElementRef.current);
		const commentsPaddingBottom = +commentsStyle.paddingBottom.slice(0, -2);
		const commentsContentBottom = commentsRect.bottom - commentsPaddingBottom;

		// Check if the user has scrolled below the bottom of the comment area.
		if (commentsContentBottom < document.documentElement.clientHeight) {
			loadingCommentsRef.current = true;

			// Fetch more comments.
			const {
				data: {
					comments: newComments,
					userCache: newUserCache
				}
			} = await (api as StoryCommentsAPI).get(`/stories/${story.id}/comments`, {
				params: {
					fromPageID: pageID,
					limit: COMMENTS_PER_REQUEST,
					...comments.length && {
						before: comments[comments.length - 1].id
					}
				}
			}).finally(() => {
				loadingCommentsRef.current = false;
			});

			if (newComments.length < COMMENTS_PER_REQUEST) {
				setNotAllCommentsLoaded(false);
			}

			if (newComments.length === 0) {
				return;
			}

			newUserCache.forEach(cacheUser);

			setComments(comments => [
				...comments,
				...newComments
			]);
		}
	});

	useEffect(() => {
		if (notAllCommentsLoaded) {
			const _viewportListener = addViewportListener(checkIfCommentsShouldBeFetched);
			frameThrottler(_viewportListener).then(checkIfCommentsShouldBeFetched);

			return () => {
				removeViewportListener(_viewportListener);
			};
		}

		// `comments` must be a dependency here so that updating it calls `checkIfCommentsShouldBeFetched` again without needing to change the viewport.
	}, [checkIfCommentsShouldBeFetched, notAllCommentsLoaded, comments]);

	const deleteComment = useFunction((commentsID: string) => {
		setComments(comments => {
			const commentsIndex = comments.findIndex(({ id }) => id === commentsID);

			return [
				...comments.slice(0, commentsIndex),
				...comments.slice(commentsIndex + 1, comments.length)
			];
		});
	});

	const setComment = useFunction((commentsPost: ClientComment) => {
		setComments(comments => {
			const commentsIndex = comments.findIndex(({ id }) => id === commentsPost.id);

			return [
				...comments.slice(0, commentsIndex),
				commentsPost,
				...comments.slice(commentsIndex + 1, comments.length)
			];
		});
	});

	return (
		<IDPrefix.Provider value="story-comments">
			<Formik
				initialValues={{ content: '' }}
				onSubmit={
					useFunction(async (
						values: { content: string },
						formikHelpers: FormikHelpers<{ content: string }>
					) => {
						if (!user) {
							// If `user` is undefined, this component cannot posibly be `active`, which means the user is trying to add a favorite without being signed in.

							if (await Dialog.confirm({
								id: 'post-comment',
								title: 'Comment',
								content: 'Sign in to post a comment!',
								actions: ['Sign In', 'Cancel']
							})) {
								promptSignIn();
							}

							return;
						}

						const { data: comment } = await (api as StoryPageCommentsAPI).post(`/stories/${story.id}/pages/${pageID}/comments`, {
							content: values.content
						});

						setComments(comments => [
							comment,
							...comments
						]);

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
			<Row
				className="story-comments"
				ref={commentsElementRef}
			>
				{comments.map(comment => (
					<Comment
						key={comment.id}
						story={story}
						setComment={setComment}
						deleteComment={deleteComment}
					>
						{comment}
					</Comment>
				))}
			</Row>
		</IDPrefix.Provider>
	);
});

export default StoryComments;