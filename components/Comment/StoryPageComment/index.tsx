import './styles.module.scss';
import type { ClientComment } from 'lib/client/comments';
import React, { useState } from 'react';
import type { PublicStory } from 'lib/client/stories';
import useFunction from 'lib/client/useFunction';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Link from 'components/Link';
import Comment from 'components/Comment';
import type { PrivateUser } from 'lib/client/users';

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

	return (
		<Comment<StoryPageCommentAPI, StoryPageCommentRatingAPI>
			apiPath={`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}`}
			comment={comment}
			setComment={setComment}
			deleteComment={deleteComment}
			className={
				`${
					story.owner === comment.author
					|| story.editors.includes(comment.author)
						? ' by-editor'
						: ''
				}${repliesShown ? ' replies-shown' : ''}`
			}
			canDeleteComments={
				useFunction((user: PrivateUser) => (
					story.owner === user.id
					|| story.editors.includes(user.id)
				))
			}
			postReply={
				useFunction(async values => {
					const { data: newCommentReply } = await (api as StoryPageCommentRepliesAPI).post(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies`, {
						content: values.content
					});

					setComment({
						...comment,
						replyCount: comment.replyCount + 1
					});

					// TODO: Display new reply.
				})
			}
		>
			{comment.replyCount !== 0 && (
				<div className="comment-replies-toggle-button-container">
					<Link
						className="comment-replies-toggle-button translucent"
						onClick={toggleRepliesShown}
					>
						{`${repliesShown ? 'Hide' : 'Show'} Replies (${comment.replyCount})`}
					</Link>
				</div>
			)}
			{repliesShown && (
				<div className="comment-replies" />
			)}
		</Comment>
	);
});

export default StoryPageComment;