import './styles.module.scss';
import type { ClientComment } from 'lib/client/comments';
import React, { useState } from 'react';
import type { PublicStory } from 'lib/client/stories';
import useFunction from 'lib/client/useFunction';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import useComment from 'lib/client/useComment';
import Link from 'components/Link';

type StoryPageCommentAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]').default>;
type StoryPageCommentRatingAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/ratings/[userID]').default>;
type StoryPageCommentRepliesAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/replies').default>;

export type CommentProps = {
	story: PublicStory,
	children: ClientComment,
	setComment: (comment: ClientComment) => void,
	deleteComment: (commentID: string) => void
};

const Comment = React.memo(({
	story,
	children: comment,
	setComment,
	deleteComment
}: CommentProps) => {
	const [repliesShown, setRepliesShown] = useState(false);

	const toggleRepliesShown = useFunction(() => {
		setRepliesShown(!repliesShown);
	});

	return useComment<StoryPageCommentAPI, StoryPageCommentRatingAPI>(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}`, {
		comment,
		setComment,
		deleteComment,
		className: (
			`${
				story.owner === comment.author
				|| story.editors.includes(comment.author)
					? ' by-editor'
					: ''
			}${repliesShown ? ' replies-shown' : ''}`
		),
		canDeleteComments: user => (
			story.owner === user.id
			|| story.editors.includes(user.id)
		),
		postReply: async (values: { content: string }) => {
			const { data: newCommentReply } = await (api as StoryPageCommentRepliesAPI).post(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/replies`, {
				content: values.content
			});

			setComment({
				...comment,
				replyCount: comment.replyCount + 1
			});

			// TODO: Display new reply.
		},
		belowComment: (
			<>
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
			</>
		)
	});
});

export default Comment;