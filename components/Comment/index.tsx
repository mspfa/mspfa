import './styles.module.scss';
import BBCode from 'components/BBCode';
import UserLink from 'components/Link/UserLink';
import Timestamp from 'components/Timestamp';
import type { ClientComment } from 'lib/client/comments';
import React from 'react';
import { promptSignIn, useUser } from 'lib/client/users';
import type { PublicStory } from 'lib/client/stories';
import { Perm } from 'lib/client/perms';
import useFunction from 'lib/client/useFunction';
import Dialog from 'lib/client/Dialog';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import IDPrefix from 'lib/client/IDPrefix';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';
import Link from 'components/Link';
import IconImage from 'components/IconImage';
import { useUserCache } from 'lib/client/UserCache';
import OptionsButton from 'components/Button/OptionsButton';
import Icon from 'components/Icon';

type StoryPageCommentAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]').default>;
type StoryPageCommentRatingAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]/ratings/[userID]').default>;

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
	const user = useUser();

	const { userCache } = useUserCache();

	/** Whether the authenticated user is the author of this comment. */
	const userIsAuthor = !!user && user.id === comment.author;

	/** The user which is the author of this comment. */
	const authorUser = userCache[comment.author];

	const promptEdit = useFunction(async () => {
		const dialog = new Dialog({
			id: 'edit-comment',
			title: 'Edit Comment',
			initialValues: {
				content: comment.content
			},
			content: (
				<IDPrefix.Provider value="comment">
					<Label block htmlFor="comment-field-content">
						Content
					</Label>
					<BBField
						name="content"
						autoFocus
						required
						maxLength={20000}
						rows={6}
					/>
				</IDPrefix.Provider>
			),
			actions: [
				{ label: 'Save', autoFocus: false },
				'Cancel'
			]
		});

		if (!(await dialog)?.submit) {
			return;
		}

		const { data: newComment } = await (api as StoryPageCommentAPI).put(
			`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}`,
			dialog.form!.values
		);

		setComment(newComment);
	});

	const promptDelete = useFunction(async () => {
		if (!await Dialog.confirm({
			id: 'edit-comment',
			title: 'Delete Comment',
			content: 'Are you sure you want to delete this comment?\n\nThis cannot be undone.'
		})) {
			return;
		}

		await (api as StoryPageCommentAPI).delete(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}`);

		deleteComment(comment.id);
	});

	const rateComment = useFunction(async (rating: NonNullable<ClientComment['userRating']>) => {
		if (!user) {
			if (await Dialog.confirm({
				id: 'rate-comment',
				title: 'Comment',
				content: 'Sign in to rate comments!',
				actions: ['Sign In', 'Cancel']
			})) {
				promptSignIn();
			}

			return;
		}

		const { data: newComment } = await (api as StoryPageCommentRatingAPI).put(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/ratings/${user.id}`, {
			rating
		});

		setComment(newComment);
	});

	const IconContainer = authorUser ? Link : 'div';

	return (
		<div className="comment">
			<IconContainer
				className="comment-icon-container"
				href={authorUser && `/user/${authorUser.id}`}
			>
				<IconImage
					className="comment-icon"
					src={authorUser?.icon}
					alt={authorUser ? `${authorUser.name}'s Icon` : 'Deleted User\'s Icon'}
				/>
			</IconContainer>
			<div className="comment-info">
				<div className="comment-heading">
					<UserLink className="comment-user-name">
						{comment.author}
					</UserLink>
					<Link
						className="comment-page-link"
						href={`/?s=${story.id}&p=${comment.pageID}`}
						shallow
					>
						{comment.pageID}
					</Link>
					<Timestamp
						relative
						withTime
						edited={comment.edited}
					>
						{comment.posted}
					</Timestamp>
				</div>
				<span className="comment-options-container">
					<OptionsButton className="comment-options-button" />
				</span>
				<div className="comment-content">
					<BBCode escapeHTML>
						{comment.content}
					</BBCode>
				</div>
				<div className="comment-actions">
					<button
						className={`like-button spaced${comment.userRating === 1 ? ' active' : ''}`}
						title="Like"
						onClick={
							useFunction(() => {
								rateComment(1);
							})
						}
					>
						<Icon>
							{comment.likeCount}
						</Icon>
					</button>
					<button
						className={`dislike-button spaced${comment.userRating === -1 ? ' active' : ''}`}
						title="Dislike"
						onClick={
							useFunction(() => {
								rateComment(-1);
							})
						}
					>
						<Icon>
							{comment.dislikeCount}
						</Icon>
					</button>
				</div>
			</div>
		</div>
	);
});

export default Comment;