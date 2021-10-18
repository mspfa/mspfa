import './styles.module.scss';
import type { ClientComment } from 'lib/client/comments';
import React, { useEffect } from 'react';
import type { PublicStory } from 'lib/client/stories';
import type { APIClient } from 'lib/client/api';
import useComments from 'lib/client/useComments';
import StoryPageCommentReply from 'components/Comment/StoryPageComment/StoryPageCommentReplies/StoryPageCommentReply';
import Link from 'components/Link';
import useFunction from 'lib/client/useFunction';

type StoryPageCommentRepliesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies').default>;

export type StoryPageCommentRepliesProps = {
	story: PublicStory,
	comment: ClientComment
};

const StoryPageCommentReplies = React.memo(({ story, comment }: StoryPageCommentRepliesProps) => {
	const {
		comments: commentReplies,
		setComment: setCommentReply,
		deleteComment: deleteCommentReply,
		loadMoreComments: loadMoreCommentReplies,
		loadingCommentsRef: loadingCommentRepliesRef
	} = useComments<StoryPageCommentRepliesAPI>(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies`);

	const nonLoadedReplyCount = comment.replyCount - commentReplies.length;

	useEffect(() => {
		// If there are no comment replies loaded yet or loading, then load more comment replies.
		if (commentReplies.length === 0 && !loadingCommentRepliesRef.current) {
			loadMoreCommentReplies();
		}
	}, [commentReplies.length, loadMoreCommentReplies, loadingCommentRepliesRef]);

	const onClickLoadMore = useFunction(() => {
		if (loadingCommentRepliesRef.current) {
			return;
		}

		loadMoreCommentReplies();
	});

	return (
		<div className="comment-replies">
			{commentReplies.map(commentReply => (
				<StoryPageCommentReply
					key={commentReply.id}
					story={story}
					comment={comment}
					setCommentReply={setCommentReply}
					deleteCommentReply={deleteCommentReply}
				>
					{commentReply}
				</StoryPageCommentReply>
			))}
			{(
				nonLoadedReplyCount !== 0
				// Prevent this from rendering for an instant immediately after the replies are first opened.
				&& commentReplies.length !== 0
			) && (
				<div className="comment-replies-action-container comment-replies-load-more-container">
					<Link
						className="comment-replies-action comment-replies-load-more translucent"
						onClick={onClickLoadMore}
					>
						{`Load More Replies (${nonLoadedReplyCount})`}
					</Link>
				</div>
			)}
		</div>
	);
});

export default StoryPageCommentReplies;