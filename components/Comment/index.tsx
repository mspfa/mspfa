import './styles.module.scss';
import BBCode from 'components/BBCode';
import UserLink from 'components/Link/UserLink';
import Timestamp from 'components/Timestamp';
import type { ClientComment } from 'lib/client/comments';
import React, { useRef } from 'react';
import { promptSignIn, useUser } from 'lib/client/users';
import type { PublicStory } from 'lib/client/stories';
import { Perm } from 'lib/client/perms';
import useFunction from 'lib/client/useFunction';
import type { DialogOptions } from 'lib/client/Dialog';
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
import StoryPageLink from 'components/StoryPageLink';

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

	/** The user which is the author of this comment. */
	const authorUser = userCache[comment.author];

	/** A ref to whether a rating request is currently loading and no new ones should be made. */
	const ratingLoadingRef = useRef(false);

	const toggleRating = useFunction(async (rating: NonNullable<ClientComment['userRating']>) => {
		if (ratingLoadingRef.current) {
			return;
		}

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

		ratingLoadingRef.current = true;

		const { data: newComment } = await (api as StoryPageCommentRatingAPI).put(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}/ratings/${user.id}`, {
			rating: comment.userRating === rating ? 0 : rating
		}).finally(() => {
			ratingLoadingRef.current = false;
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
					<StoryPageLink
						className="comment-page-link"
						pageID={comment.pageID}
					>
						{comment.pageID}
					</StoryPageLink>
					<Timestamp
						relative
						withTime
						edited={comment.edited}
					>
						{comment.posted}
					</Timestamp>
				</div>
				<span className="comment-options-container">
					<OptionsButton
						className="comment-options-button"
						onClick={
							useFunction(async () => {
								const actions: DialogOptions['actions'] = [
									'Cancel'
								];

								if (!(user && user.id === comment.author)) {
									actions.unshift(
										{ value: 'report', label: 'Report' }
									);
								}

								if (user) {
									if (
										user.id === comment.author
										|| story.owner === user.id
										|| story.editors.includes(user.id)
										|| user.perms & Perm.sudoDelete
									) {
										actions.unshift(
											{ value: 'delete', label: 'Delete' }
										);
									}

									if (
										user.id === comment.author
										|| user.perms & Perm.sudoWrite
									) {
										actions.unshift(
											{ value: 'edit', label: 'Edit' }
										);
									}
								}

								const result = await new Dialog({
									id: 'comment-options',
									title: 'Comment Options',
									content: 'What will you do with this comment?',
									actions
								});

								if (!result) {
									return;
								}

								if (result.value === 'edit') {
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

									return;
								}

								if (result.value === 'delete') {
									if (!await Dialog.confirm({
										id: 'edit-comment',
										title: 'Delete Comment',
										content: 'Are you sure you want to delete this comment?\n\nThis cannot be undone.'
									})) {
										return;
									}

									await (api as StoryPageCommentAPI).delete(`/stories/${story.id}/pages/${comment.pageID}/comments/${comment.id}`);

									deleteComment(comment.id);

									return;
								}

								if (result.value === 'report') {
									// TODO: Report this comment.
								}
							})
						}
					/>
				</span>
				<div className="comment-content">
					<BBCode escapeHTML>
						{comment.content}
					</BBCode>
				</div>
				<div className="comment-actions">
					<span className="comment-ratings">
						<button
							className={`comment-rating-button like-button${comment.userRating === 1 ? ' active' : ''}`}
							disabled={user?.id === comment.author}
							title="Like"
							onClick={
								useFunction(() => {
									toggleRating(1);
								})
							}
						>
							<Icon>
								{comment.likeCount}
							</Icon>
						</button>
						<button
							className={`comment-rating-button dislike-button${comment.userRating === -1 ? ' active' : ''}`}
							disabled={user?.id === comment.author}
							title="Dislike"
							onClick={
								useFunction(() => {
									toggleRating(-1);
								})
							}
						>
							<Icon>
								{comment.dislikeCount}
							</Icon>
						</button>
					</span>
					<Link className="comment-reply-button translucent">
						Reply
					</Link>
				</div>
			</div>
		</div>
	);
});

export default Comment;