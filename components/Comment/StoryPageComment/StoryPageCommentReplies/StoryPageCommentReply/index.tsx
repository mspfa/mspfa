import type { ClientComment, ClientCommentReply } from 'lib/client/comments';
import React from 'react';
import type { PublicStory } from 'lib/client/stories';
import useFunction from 'lib/client/useFunction';
import type { APIClient } from 'lib/client/api';
import Comment from 'components/Comment';

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
		apiPath={`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies/${commentReply.id}`}
		story={story}
		comment={commentReply}
		setComment={setCommentReply}
		deleteComment={deleteCommentReply}
		postReply={
			useFunction(async values => {
				// TODO
			})
		}
	/>
));

export default StoryPageCommentReply;