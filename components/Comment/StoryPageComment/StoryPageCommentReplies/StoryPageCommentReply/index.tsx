import type { ClientComment, ClientCommentReply } from 'lib/client/comments';
import React from 'react';
import type { APIClient } from 'lib/client/api';
import type { CommentProps } from 'components/Comment';
import Comment from 'components/Comment';

type StoryPageCommentReplyAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies/[commentReplyID]').default>;
type StoryPageCommentReplyRatingAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies/[commentReplyID]/ratings/[userID]').default>;

export type StoryPageCommentReplyProps = Pick<CommentProps<ClientCommentReply>, 'story' | 'children' | 'postReply'> & {
	comment: ClientComment,
	setCommentReply: (commentReply: ClientCommentReply) => void,
	deleteCommentReply: (commentReplyID: string) => void
};

const StoryPageCommentReply = React.memo(({
	story,
	comment,
	children: commentReply,
	setCommentReply,
	deleteCommentReply,
	postReply
}: StoryPageCommentReplyProps) => (
	<Comment<StoryPageCommentReplyAPI, StoryPageCommentReplyRatingAPI>
		apiPath={`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies/${commentReply.id}`}
		story={story}
		setComment={setCommentReply}
		deleteComment={deleteCommentReply}
		postReply={postReply}
	>
		{commentReply}
	</Comment>
));

export default StoryPageCommentReply;