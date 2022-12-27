import './styles.module.scss';
import type { APIHandler } from 'lib/server/api';
import type { APIClient } from 'lib/client/api';
import type { ClientComment, ClientCommentOrReply } from 'lib/client/comments';
import { useUser } from 'lib/client/reactContexts/UserContext';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import React, { useRef, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'components/Dialog';
import api from 'lib/client/api';
import Link from 'components/Link';
import { useLeaveConfirmation } from 'lib/client/forms';
import IDPrefix from 'lib/client/reactContexts/IDPrefix';
import Perm, { hasPerms } from 'lib/client/Perm';
import BBCode from 'components/BBCode';
import BBField from 'components/BBCode/BBField';
import Button from 'components/Button';
import OptionsButton from 'components/Button/OptionsButton';
import Icon from 'components/Icon';
import IconImage from 'components/IconImage';
import Label from 'components/Label';
import UserLink from 'components/Link/UserLink';
import StoryPageLink from 'components/StoryPageLink';
import Timestamp from 'components/Timestamp';
import { Formik, Form, Field } from 'formik';
import type { PublicStory } from 'lib/client/stories';
import classNames from 'classnames';
import Action from 'components/Dialog/Action';
import promptSignIn from 'lib/client/promptSignIn';

export type CommentProps<ClientComment = ClientCommentOrReply> = {
	/** The API path of this comment. */
	apiPath: string,
	story: PublicStory,
	children: ClientComment,
	setComment: (comment: ClientComment) => void,
	deleteComment: (commentID: string) => void,
	className?: string,
	postReply: (values: { content: string }) => void | PromiseLike<void>
};

/** The base component for any type of comment. */
const Comment = <
	CommentAPI extends APIClient<APIHandler<{
		method: 'GET'
	} | {
		method: 'DELETE'
	} | {
		method: 'PATCH',
		body: Pick<Awaited<ReturnType<CommentAPI['get']>>['data'], 'content'>
	}, {
		method: 'GET',
		body: ClientCommentOrReply
	} | {
		method: 'DELETE'
	} | {
		method: 'PATCH',
		body: Awaited<ReturnType<CommentAPI['get']>>['data']
	}>>,
	CommentRatingAPI extends APIClient<APIHandler<{
		method: 'PUT',
		body: NonNullable<ClientComment['userRating']>
	}, {
		method: 'PUT',
		body: Awaited<ReturnType<CommentAPI['get']>>['data']
	}>>
>({
	apiPath,
	story,
	children: comment,
	setComment,
	deleteComment,
	className,
	postReply
}: CommentProps<Awaited<ReturnType<CommentAPI['get']>>['data']>) => {
	const [user] = useUser();

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
			promptSignIn({
				title: 'Rate Comment',
				content: 'Sign in to rate comments!'
			});
			return;
		}

		if (user.id === comment.author) {
			Dialog.create(
				<Dialog id="rate-comment" title="Rate Comment">
					You can't rate your own comments!
				</Dialog>
			);
			return;
		}

		ratingLoadingRef.current = true;

		const { data: newComment } = await (api.put as CommentRatingAPI['put'])(
			`${apiPath}/ratings/${user.id}`,
			comment.userRating === rating ? 0 : rating
		).finally(() => {
			ratingLoadingRef.current = false;
		});

		setComment(newComment);
	});

	const [replying, setReplying] = useState(false);

	const replyContentFieldRef = useRef<HTMLTextAreaElement>(null);

	const onSubmitReply = useFunction(async (values: { content: string }) => {
		if (!user) {
			promptSignIn({
				title: 'Comment',
				content: 'Sign in to post your reply!'
			});
			return;
		}

		await postReply(values);

		setReplying(false);
	});

	const IconContainer = authorUser ? Link : 'div';

	return (
		<div
			className={classNames(
				`comment comment-${comment.id} by-${comment.author}`,
				{
					'by-self': user?.id === comment.author,
					'by-editor': (
						story.owner === comment.author
						|| story.editors.includes(comment.author)
					)
				},
				className
			)}
		>
			<IconContainer
				className="comment-icon-container"
				href={authorUser && `/users/${authorUser.id}`}
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
					{comment.pageID !== undefined && (
						<StoryPageLink
							className="comment-page-link"
							pageID={comment.pageID}
						>
							{comment.pageID}
						</StoryPageLink>
					)}
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
						onClick={
							useFunction(async () => {
								type Action = 'report' | 'delete' | 'edit';
								const optionsDialog = await Dialog.create<{}, Action>(
									<Dialog id="comment-options" title="Comment Options">
										What will you do with this comment?

										{user && (
											user.id === comment.author
											|| hasPerms(user, Perm.WRITE)
										) && (
											<Action value="edit">Edit</Action>
										)}
										{user && (
											user.id === comment.author
											|| story.owner === user.id
											|| story.editors.includes(user.id)
											|| hasPerms(user, Perm.DELETE)
										) && (
											<Action value="delete">Delete</Action>
										)}
										{user?.id !== comment.author && (
											<Action value="report">Report</Action>
										)}
										{Action.CANCEL}
									</Dialog>
								);

								if (optionsDialog.canceled) {
									return;
								}

								if (optionsDialog.action === 'edit') {
									const initialValues = {
										content: comment.content
									};

									type Values = typeof initialValues;
									const dialog = await Dialog.create<Values>(
										<Dialog
											id="edit-comment"
											title="Edit Comment"
											initialValues={initialValues}
										>
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
													escapeHTML
												/>

												<Action>Save</Action>
												{Action.CANCEL}
											</IDPrefix.Provider>
										</Dialog>
									);

									if (dialog.canceled) {
										return;
									}

									const { data: newComment } = await (api.patch as CommentAPI['patch'])(apiPath, dialog.values);

									setComment(newComment);

									return;
								}

								if (optionsDialog.action === 'delete') {
									if (!await Dialog.confirm(
										<Dialog id="edit-comment" title="Delete Comment">
											Are you sure you want to delete this comment?<br />
											<br />
											This cannot be undone.
										</Dialog>
									)) {
										return;
									}

									await (api.delete as CommentAPI['delete'])(apiPath);

									deleteComment(comment.id);

									return;
								}

								if (optionsDialog.action === 'report') {
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
							className={classNames(
								'comment-action comment-rating-button like-button',
								{ active: comment.userRating === 1 }
							)}
							title="Like"
							onClick={
								useFunction(() => {
									toggleRating(1);
								})
							}
						>
							<Icon>
								{comment.likeCount !== 0 && comment.likeCount}
							</Icon>
						</button>
						<button
							className={classNames(
								'comment-action comment-rating-button dislike-button',
								{ active: comment.userRating === -1 }
							)}
							title="Dislike"
							onClick={
								useFunction(() => {
									toggleRating(-1);
								})
							}
						>
							<Icon>
								{comment.dislikeCount !== 0 && comment.dislikeCount}
							</Icon>
						</button>
					</span>
					<Link
						className="comment-action comment-reply-button translucent"
						onClick={
							useFunction(() => {
								if (replying) {
									replyContentFieldRef.current!.focus();
								} else {
									setReplying(true);
								}
							})
						}
					>
						Reply
					</Link>
				</div>
				{replying && (
					<Formik
						initialValues={{
							content: ''
						}}
						onSubmit={onSubmitReply}
					>
						{function CommentReplyForm({ dirty, isSubmitting }) {
							useLeaveConfirmation(dirty);

							return (
								<Form className="comment-reply-form">
									<Label
										block
										htmlFor={`comment-${comment.id}-reply-field-content`}
									>
										Post a Reply
									</Label>
									<Field
										as="textarea"
										id={`comment-${comment.id}-reply-field-content`}
										name="content"
										required
										maxLength={2000}
										rows={3}
										disabled={isSubmitting}
										autoFocus
										innerRef={replyContentFieldRef}
									/>
									<div className="comment-reply-form-actions">
										<Button
											type="submit"
											className="small"
											disabled={isSubmitting}
										>
											Submit!
										</Button>
										<Button
											className="small"
											disabled={isSubmitting}
											onClick={
												useFunction(() => {
													setReplying(false);
												})
											}
										>
											Cancel
										</Button>
									</div>
								</Form>
							);
						}}
					</Formik>
				)}
			</div>
		</div>
	);
};

export default Comment;
