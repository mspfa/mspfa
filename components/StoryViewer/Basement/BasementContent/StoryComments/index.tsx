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
import IDPrefix from 'lib/client/reactContexts/IDPrefix';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useUser } from 'lib/client/reactContexts/UserContext';
import type { ChangeEvent } from 'react';
import React, { useContext, useRef, useState, useEffect } from 'react';
import type { StoryCommentsSortMode } from 'pages/api/stories/[storyID]/comments';
import useComments from 'lib/client/reactHooks/useComments';
import StoryPageComment from 'components/Comment/StoryPageComment';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import frameThrottler from 'lib/client/frameThrottler';
import promptSignIn from 'lib/client/promptSignIn';
import useOnChange from 'lib/client/reactHooks/useOnChange';

type StoryCommentsAPI = APIClient<typeof import('pages/api/stories/[storyID]/comments').default>;
type StoryPageCommentsAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments').default>;

const StoryComments = React.memo(() => {
	const { story } = useContext(StoryViewerContext)!;

	// This can be asserted as non-nullable because `StoryComments` should never be rendered on pages that don't exist.
	const pageID = useContext(PageIDContext)!;

	const [user] = useUser();

	const [sortMode, setSortMode] = useState<StoryCommentsSortMode>('pageID');

	const {
		comments,
		updateComments,
		setComment,
		deleteComment,
		loadMoreComments,
		loadingCommentsRef
	} = useComments<StoryCommentsAPI>(`/stories/${story.id}/comments`, {
		params: {
			fromPageID: pageID,
			sort: sortMode
		}
	});

	const [notAllCommentsLoaded, setNotAllCommentsLoaded] = useState(true);

	/** Empties the `comments` so they can be loaded again. */
	const resetComments = () => {
		updateComments([]);
		setNotAllCommentsLoaded(true);
	};

	// Reset comments whenever the page changes.
	useOnChange(pageID, resetComments);
	// Reset comments whenever the user changes, because otherwise comment ratings could be inaccurate.
	useOnChange(user?.id, resetComments);

	/** A ref to the element containing the comments. */
	const commentsElementRef = useRef<HTMLDivElement>(null as never);

	/** Loads more comments if the bottom of the comment section is in view. */
	const checkToLoadMoreComments = useFunction(async () => {
		if (loadingCommentsRef.current) {
			return;
		}

		const commentsRect = commentsElementRef.current.getBoundingClientRect();
		const commentsStyle = window.getComputedStyle(commentsElementRef.current);
		const commentsPaddingBottom = +commentsStyle.paddingBottom.slice(0, -2);
		const commentsContentBottom = commentsRect.bottom - commentsPaddingBottom;

		// Check if the user has scrolled below the bottom of the comment area.
		if (commentsContentBottom < document.documentElement.clientHeight) {
			const allCommentsLoaded = await loadMoreComments();

			if (allCommentsLoaded) {
				setNotAllCommentsLoaded(false);
			}
		}
	});

	useEffect(() => {
		if (notAllCommentsLoaded) {
			const viewportListenerKey = addViewportListener(checkToLoadMoreComments);
			frameThrottler(viewportListenerKey).then(checkToLoadMoreComments);

			return () => {
				removeViewportListener(viewportListenerKey);
			};
		}

		// `comments` must be a dependency here so that updating it calls `checkToLoadMoreComments` again without needing to change the viewport.
	}, [comments, notAllCommentsLoaded, checkToLoadMoreComments]);

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
							promptSignIn({
								title: 'Comment',
								content: 'Sign in to post your comment!'
							});
							return;
						}

						const { data: newComment } = await (api as StoryPageCommentsAPI).post(`/stories/${story.id}/pages/${pageID}/comments`, {
							content: values.content
						});

						// Add the new comment to the top (regardless of the sort mode).
						updateComments(comments => {
							comments.unshift(newComment);
						});

						formikHelpers.setFieldValue('content', '');
					})
				}
			>
				{({ isSubmitting }) => (
					<Form className="row story-comment-form">
						<Label block htmlFor="story-comment-field-content">
							Post a Comment
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
				)}
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
						<option value="rating">Rating</option>
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
