import { useEffect, useRef, useState } from 'react';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { ClientCommentOrReply } from 'lib/client/comments';
import frameThrottler from 'lib/client/frameThrottler';
import useFunction from 'lib/client/useFunction';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
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

	const [notAllCommentsLoaded, setNotAllCommentsLoaded] = useState(true);
	/** A ref to whether comments are currently being requested. */
	const loadingCommentsRef = useRef(false);
	/** A ref to the element containing the comments. */
	const commentsElementRef = useRef<HTMLDivElement>(null!);

	const { cacheUser } = useUserCache();

	const checkIfCommentsShouldBeFetched = useFunction(async () => {
		if (loadingCommentsRef.current) {
			return;
		}

		const commentsRect = commentsElementRef.current.getBoundingClientRect();
		const commentsStyle = window.getComputedStyle(commentsElementRef.current);
		const commentsPaddingBottom = +commentsStyle.paddingBottom.slice(0, -2);
		const commentsContentBottom = commentsRect.bottom - commentsPaddingBottom;

		// Check if the user has scrolled below the bottom of the comment area.
		if (commentsContentBottom < document.documentElement.clientHeight) {
			loadingCommentsRef.current = true;

			// Fetch more comments.
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

			if (newComments.length < COMMENTS_PER_REQUEST) {
				setNotAllCommentsLoaded(false);
			}

			if (newComments.length === 0) {
				return;
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
		}
	});

	useEffect(() => {
		if (notAllCommentsLoaded) {
			const _viewportListener = addViewportListener(checkIfCommentsShouldBeFetched);
			frameThrottler(_viewportListener).then(checkIfCommentsShouldBeFetched);

			return () => {
				removeViewportListener(_viewportListener);
			};
		}

		// `comments` must be a dependency here so that updating it calls `checkIfCommentsShouldBeFetched` again without needing to change the viewport.
	}, [comments, notAllCommentsLoaded, checkIfCommentsShouldBeFetched]);

	const deleteComment = useFunction((commentsID: string) => {
		setComments(comments => {
			const commentsIndex = comments.findIndex(({ id }) => id === commentsID);

			return [
				...comments.slice(0, commentsIndex),
				...comments.slice(commentsIndex + 1, comments.length)
			];
		});
	});

	const setComment = useFunction((commentsPost: ClientComment) => {
		setComments(comments => {
			const commentsIndex = comments.findIndex(({ id }) => id === commentsPost.id);

			return [
				...comments.slice(0, commentsIndex),
				commentsPost,
				...comments.slice(commentsIndex + 1, comments.length)
			];
		});
	});

	return {
		comments,
		setComments,
		setNotAllCommentsLoaded,
		commentsElementRef,
		setComment,
		deleteComment
	};
};

export default useComments;