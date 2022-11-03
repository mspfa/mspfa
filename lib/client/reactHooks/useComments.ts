import { useRef } from 'react';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { ClientCommentOrReply } from 'lib/client/comments';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import type { APIHandler } from 'lib/server/api';
import type { integer } from 'lib/types';
import type { PublicUser } from 'lib/client/users';
import { useImmer } from 'use-immer';
import { castDraft } from 'immer';

/** The number of comments to request at a time. */
const COMMENTS_PER_REQUEST = 10;

const useComments = <
	CommentsAPI extends APIClient<APIHandler<{
		method: 'GET',
		query: {
			/** How many results to respond with. */
			limit?: integer | string,
			/** Filter the results to only include comments after the comment with this ID. */
			after?: string
		}
	}, {
		method: 'GET',
		body: {
			comments: ClientCommentOrReply[],
			userCache: PublicUser[]
		}
	}>>
>(
	/** The API path to `GET` new comments from. */
	apiPath: string,
	{ initialComments = [], params }: {
		initialComments?: Array<Awaited<ReturnType<CommentsAPI['get']>>['data']['comments'][0]>,
		/** The API query params (other than `limit` and `after`) to include in the request to `GET` new comments. */
		params?: Omit<NonNullable<Parameters<CommentsAPI['get']>[1]>['params'], 'limit' | 'after'>
	} = {}
) => {
	type ClientComment = Awaited<ReturnType<CommentsAPI['get']>>['data']['comments'][0];

	const [comments, updateComments] = useImmer<ClientComment[]>(initialComments);

	/** A ref to whether comments are currently being requested. */
	const loadingCommentsRef = useRef(false);
	/** The ID of the comment to insert newly loaded comments after. */
	const afterCommentIDRef = useRef<string>();

	// If `comments` was emptied, empty the `afterCommentIDRef` as well.
	if (comments.length === 0) {
		afterCommentIDRef.current = undefined;
	}

	const { cacheUser } = useUserCache();

	/**
	 * Loads more comments. Always ensure that `loadingCommentsRef.current` is `false` before calling this.
	 *
	 * If the API request is successful, returns whether all comments have been loaded yet.
	 */
	const loadMoreComments = useFunction(async () => {
		loadingCommentsRef.current = true;

		const {
			data: {
				comments: commentsToInsert,
				userCache: newUserCache
			}
		} = await (api.get as CommentsAPI['get'])(apiPath, {
			params: {
				limit: COMMENTS_PER_REQUEST,
				...afterCommentIDRef.current && {
					after: afterCommentIDRef.current
				},
				...params
			}
		}).finally(() => {
			loadingCommentsRef.current = false;
		});

		if (commentsToInsert.length === 0) {
			return true;
		}

		newUserCache.forEach(cacheUser);

		/** The index to insert new comments into the `comments` array. */
		const commentsToInsertIndex = (
			afterCommentIDRef.current
				? comments.findIndex(({ id }) => id === afterCommentIDRef.current) + 1
				: 0
		);

		const notOldDuplicate = (comment: ClientComment) => (
			// If there exists some new comment with the same ID as this existing comment, filter out this existing comment, as it would otherwise lead to duplicate React keys as well as potentially inconsistent instances of the same comment being rendered.
			// Duplicate comments can occur, for example, due to the user posting a new comment while sorting by oldest and then scrolling down to find the new comment they posted at the bottom again.
			!commentsToInsert.some(commentToInsert => commentToInsert.id === comment.id)
		);
		const newComments = comments.filter(notOldDuplicate);

		// We can't just insert new comments at the end since there may be new comments posted by the user which should remain below newly loaded comments.
		newComments.splice(commentsToInsertIndex, 0, ...commentsToInsert);

		afterCommentIDRef.current = commentsToInsert[commentsToInsert.length - 1].id;

		updateComments(newComments);

		return commentsToInsert.length < COMMENTS_PER_REQUEST;
	});

	const deleteComment = useFunction((commentID: string) => {
		updateComments(comments => {
			const commentIndex = comments.findIndex(({ id }) => id === commentID);

			comments.splice(commentIndex, 1);
		});
	});

	const setComment = useFunction((comment: ClientComment) => {
		updateComments(comments => {
			const commentIndex = comments.findIndex(({ id }) => id === comment.id);

			comments[commentIndex] = castDraft(comment);
		});
	});

	return {
		comments,
		updateComments,
		setComment,
		deleteComment,
		loadMoreComments,
		loadingCommentsRef
	};
};

export default useComments;
