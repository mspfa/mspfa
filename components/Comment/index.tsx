import './styles.module.scss';
import BBCode from 'components/BBCode';
import UserLink from 'components/Link/UserLink';
import Timestamp from 'components/Timestamp';
import type { ClientComment } from 'lib/client/comments';
import React from 'react';
import EditButton from 'components/Button/EditButton';
import RemoveButton from 'components/Button/RemoveButton';
import { useUser } from 'lib/client/users';
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

type StoryPageCommentAPI = APIClient<typeof import('pages/api/stories/[storyID]/pages/[pageID]/comments/[commentID]').default>;

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
				<div className="comment-actions">
					{(userIsAuthor || (
						user
						&& !!(user.perms & Perm.sudoWrite)
					)) && (
						<EditButton
							title="Edit Comment"
							onClick={promptEdit}
						/>
					)}
					{(userIsAuthor || (
						user
						&& !!(user.perms & Perm.sudoDelete)
					)) && (
						<RemoveButton
							title="Delete Comment"
							onClick={promptDelete}
						/>
					)}
				</div>
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
				<div className="comment-content">
					<BBCode html>
						{comment.content}
					</BBCode>
				</div>
			</div>
		</div>
	);
});

export default Comment;