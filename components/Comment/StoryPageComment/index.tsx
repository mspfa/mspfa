import './styles.module.scss';
import type { ClientComment, ClientCommentReply } from 'lib/client/comments';
import type { Dispatch, SetStateAction } from 'react';
import React, { useRef, useState } from 'react';
import type { PublicStory } from 'lib/client/stories';
import useFunction from 'lib/client/useFunction';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Link from 'components/Link';
import Comment from 'components/Comment';
import StoryPageCommentReplies from 'components/Comment/StoryPageComment/StoryPageCommentReplies';
import { useLatest } from 'react-use';

type StoryPageCommentAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]').default>;
type StoryPageCommentRatingAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/ratings/[userID]').default>;
type StoryPageCommentRepliesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies').default>;

export type StoryPageCommentProps = {
	story: PublicStory,
	children: ClientComment,
	setComment: (comment: ClientComment) => void,
	deleteComment: (commentID: string) => void
};

const StoryPageComment = React.memo(({
	story,
	children: comment,
	setComment,
	deleteComment
}: StoryPageCommentProps) => {
	const [repliesShown, setRepliesShown] = useState(false);

	const toggleRepliesShown = useFunction(() => {
		setRepliesShown(!repliesShown);
	});

	/** A ref to the latest value of `comment` to avoid race conditions. */
	const commentRef = useLatest(comment);

	const setCommentRepliesRef = useRef<Dispatch<SetStateAction<ClientCommentReply[]>>>();

	return (
		<>
			<Comment<StoryPageCommentAPI, StoryPageCommentRatingAPI>
				apiPath={`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}`}
				story={story}
				setComment={setComment}
				deleteComment={deleteComment}
				className={
					(comment.replyCount ? 'with-replies' : '')
					+ (
						repliesShown
							? `${comment.replyCount ? ' ' : ''}replies-shown`
							: ''
					)
				}
				postReply={
					useFunction(async values => {
						const { data: newCommentReply } = await (api as StoryPageCommentRepliesAPI).post(
							`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies`,
							values
						);

						// Increment the reply count of the parent comment.
						setComment({
							...commentRef.current,
							replyCount: commentRef.current.replyCount + 1
						});

						setCommentRepliesRef.current?.(commentReplies => [
							...commentReplies,
							newCommentReply
						]);
					})
				}
			>
				{comment}
			</Comment>
			<div className="comment-replies-container">
				{comment.replyCount !== 0 && (
					<div className="comment-replies-action-container comment-replies-toggle-container">
						<Link
							className="comment-replies-action comment-replies-toggle translucent"
							onClick={toggleRepliesShown}
						>
							{`${repliesShown ? 'Hide' : 'Show'} Replies (${comment.replyCount})`}
						</Link>
					</div>
				)}
				{repliesShown && (
					<StoryPageCommentReplies
						story={story}
						comment={comment}
						setCommentRepliesRef={setCommentRepliesRef}
					/>
				)}
			</div>
		</>
	);
});

export default StoryPageComment;