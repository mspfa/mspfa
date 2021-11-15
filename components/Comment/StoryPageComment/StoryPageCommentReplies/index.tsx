import './styles.module.scss';
import type { ClientComment, ClientCommentReply } from 'lib/client/comments';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import React, { useEffect } from 'react';
import type { PublicStory } from 'lib/client/stories';
import type { APIClient } from 'lib/client/api';
import useComments from 'lib/client/reactHooks/useComments';
import StoryPageCommentReply from 'components/Comment/StoryPageComment/StoryPageCommentReplies/StoryPageCommentReply';
import Link from 'components/Link';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { CommentProps } from 'components/Comment';
import type { integer } from 'lib/types';

type StoryPageCommentRepliesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies').default>;

export type StoryPageCommentRepliesProps = {
	story: PublicStory,
	comment: ClientComment,
	setCommentRepliesRef: MutableRefObject<Dispatch<SetStateAction<ClientCommentReply[]>> | undefined>,
	initialCommentRepliesRef: MutableRefObject<ClientCommentReply[]>,
	addToReplyCount: (amount: integer) => void
} & Pick<CommentProps<ClientCommentReply>, 'postReply'>;

const StoryPageCommentReplies = React.memo(({ story, comment, setCommentRepliesRef, initialCommentRepliesRef, addToReplyCount, postReply }: StoryPageCommentRepliesProps) => {
	const {
		comments: commentReplies,
		setComments: setCommentReplies,
		setComment: setCommentReply,
		deleteComment: deleteCommentReply,
		loadMoreComments: loadMoreCommentReplies,
		loadingCommentsRef: loadingCommentRepliesRef
	} = useComments<StoryPageCommentRepliesAPI>(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies`, {
		initialComments: initialCommentRepliesRef.current
	});

	const deleteCommentReplyAndDecrementReplyCount = useFunction((commentReplyID: string) => {
		deleteCommentReply(commentReplyID);
		addToReplyCount(-1);
	});

	// Empty the `initialCommentRepliesRef` so it is not reused next time replies are opened.
	initialCommentRepliesRef.current = [];

	useEffect(() => {
		setCommentRepliesRef.current = setCommentReplies;

		return () => {
			setCommentRepliesRef.current = undefined;
		};
	}, [setCommentRepliesRef, setCommentReplies]);

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
					deleteCommentReply={deleteCommentReplyAndDecrementReplyCount}
					postReply={postReply}
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