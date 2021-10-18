import type { ClientComment } from 'lib/client/comments';
import React from 'react';
import type { PublicStory } from 'lib/client/stories';
import type { APIClient } from 'lib/client/api';
import useComments from 'lib/client/useComments';
import StoryPageCommentReply from 'components/Comment/StoryPageComment/StoryPageCommentReplies/StoryPageCommentReply';

type StoryPageCommentRepliesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies').default>;

export type StoryPageCommentRepliesProps = {
	story: PublicStory,
	comment: ClientComment
};

const StoryPageCommentReplies = React.memo(({ story, comment }: StoryPageCommentRepliesProps) => {
	const {
		comments: commentReplies,
		commentsElementRef,
		setComment,
		deleteComment
	} = useComments<StoryPageCommentRepliesAPI>(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies`);

	return (
		<div
			className="comment-replies"
			ref={commentsElementRef}
		>
			{commentReplies.map(commentReply => (
				<StoryPageCommentReply
					key={commentReply.id}
					story={story}
					comment={comment}
					setCommentReply={setComment}
					deleteCommentReply={deleteComment}
				>
					{commentReply}
				</StoryPageCommentReply>
			))}
		</div>
	);
});

export default StoryPageCommentReplies;