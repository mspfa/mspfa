import type { ClientComment, ClientCommentReply } from 'lib/client/comments';
import React from 'react';
import type { PublicStory } from 'lib/client/stories';
import useFunction from 'lib/client/useFunction';
import type { APIClient } from 'lib/client/api';
import Comment from 'components/Comment';
import type { PrivateUser } from 'lib/client/users';

type StoryPageCommentReplyAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies/[commentReplyID]').default>;
type StoryPageCommentReplyRatingAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies/[commentReplyID]/ratings/[userID]').default>;

export type StoryPageCommentReplyProps = {
	story: PublicStory,
	comment: ClientComment,
	children: ClientCommentReply,
	setCommentReply: (comment: ClientCommentReply) => void,
	deleteCommentReply: (commentReplyID: string) => void
};

const StoryPageCommentReply = React.memo(({
	story,
	comment,
	children: commentReply,
	setCommentReply,
	deleteCommentReply
}: StoryPageCommentReplyProps) => (
	<Comment<StoryPageCommentReplyAPI, StoryPageCommentReplyRatingAPI>
		key={commentReply.id}
		apiPath={`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies/${commentReply.id}`}
		comment={commentReply}
		setComment={setCommentReply}
		deleteComment={deleteCommentReply}
		className={
			story.owner === comment.author
			|| story.editors.includes(comment.author)
				? 'by-editor'
				: undefined
		}
		canDeleteComments={
			useFunction((user: PrivateUser) => (
				story.owner === user.id
				|| story.editors.includes(user.id)
			))
		}
		postReply={
			useFunction(async values => {
				// TODO
			})
		}
	/>
));

export default StoryPageCommentReply;