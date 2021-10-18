import { useRef, useState } from 'react';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { ClientCommentOrReply } from 'lib/client/comments';
import useFunction from 'lib/client/useFunction';
import { useUserCache } from 'lib/client/UserCache';
import type { APIHandler } from 'lib/server/api';
import type { Awaited, integer } from 'lib/types';
import type { PublicUser } from 'lib/client/users';

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
	{ params }: {
		/** The API query params (other than `limit` and `after`) to include in the request to `GET` new comments. */
		params?: Omit<NonNullable<Parameters<CommentsAPI['get']>[1]>['params'], 'limit' | 'after'>
	} = {}
) => {
	type ClientComment = Awaited<ReturnType<CommentsAPI['get']>>['data']['comments'][0];

	const [comments, setComments] = useState<ClientComment[]>([]);

	/** A ref to whether comments are currently being requested. */
	const loadingCommentsRef = useRef(false);

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
				comments: newComments,
				userCache: newUserCache
			}
		} = await (api.get as CommentsAPI['get'])(apiPath, {
			params: {
				limit: COMMENTS_PER_REQUEST,
				...comments.length && {
					after: comments[comments.length - 1].id
				},
				...params
			}
		}).finally(() => {
			loadingCommentsRef.current = false;
		});

		if (newComments.length === 0) {
			return true;
		}

		newUserCache.forEach(cacheUser);

		setComments(comments => [
			...comments.filter(comment => (
				// If there exists some new comment with the same ID as this existing comment, filter out this existing comment, as it would otherwise lead to duplicate React keys as well as potentially inconsistent instances of the same comment being rendered.
				// Duplicate comments can occur, for example, due to the user posting a new comment while sorting by oldest and then scrolling down to find the new comment they posted at the bottom again.
				!newComments.some(newComment => newComment.id === comment.id)
			)),
			...newComments
		]);

		return newComments.length < COMMENTS_PER_REQUEST;
	});

	const deleteComment = useFunction((commentID: string) => {
		setComments(comments => {
			const commentIndex = comments.findIndex(({ id }) => id === commentID);

			return [
				...comments.slice(0, commentIndex),
				...comments.slice(commentIndex + 1, comments.length)
			];
		});
	});

	const setComment = useFunction((comment: ClientComment) => {
		setComments(comments => {
			const commentIndex = comments.findIndex(({ id }) => id === comment.id);

			return [
				...comments.slice(0, commentIndex),
				comment,
				...comments.slice(commentIndex + 1, comments.length)
			];
		});
	});

	return {
		comments,
		setComments,
		setComment,
		deleteComment,
		loadMoreComments,
		loadingCommentsRef
	};
};

export default useComments;