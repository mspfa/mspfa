import './styles.module.scss';
import BBField from 'components/BBCode/BBField';
import Button from 'components/Button';
import Label from 'components/Label';
import NewsPost from 'components/NewsPost';
import Row from 'components/Row';
import { StoryViewerContext } from 'components/StoryViewer';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Dialog from 'components/Dialog';
import frameThrottler from 'lib/client/frameThrottler';
import IDPrefix from 'lib/client/reactContexts/IDPrefix';
import type { ClientNewsPost } from 'lib/client/news';
import Perm, { hasPerms } from 'lib/client/Perm';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useUserCache } from 'lib/client/reactContexts/UserCache';
import { useUser } from 'lib/client/reactContexts/UserContext';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import React, { useContext, useEffect, useRef, useState } from 'react';
import useMountedRef from 'lib/client/reactHooks/useMountedRef';
import { useImmer } from 'use-immer';
import Action from 'components/Dialog/Action';

type StoryNewsAPI = APIClient<typeof import('pages/api/stories/[storyID]/news').default>;

/** The maximum number of news posts to request each time. */
export const NEWS_POSTS_PER_REQUEST = 3;

const StoryNews = React.memo(() => {
	const {
		story,
		newsPosts: initialNewsPosts
	} = useContext(StoryViewerContext)!;

	const { cacheUser } = useUserCache();

	const [user] = useUser();

	const [newsPosts, updateNewsPosts] = useImmer([...initialNewsPosts]);

	const mountedRef = useMountedRef();

	useEffect(() => () => {
		// Mutate the `initialNewsPosts` so that the initial news posts are still up-to-date (and still within the `NEWS_POSTS_PER_REQUEST` limit) for the next time this component mounts.

		initialNewsPosts.length = 0;
		initialNewsPosts.push(...newsPosts.slice(0, NEWS_POSTS_PER_REQUEST));
	});

	const createNewsPost = useFunction(async () => {
		const initialValues = {
			content: ''
		};

		type Values = typeof initialValues;
		const dialog = await Dialog.create<Values>(
			<Dialog
				id="edit-news"
				title="Create News Post"
				initialValues={initialValues}
			>
				<IDPrefix.Provider value="news">
					<Row>
						<Label block htmlFor="news-field-content">
							Content
						</Label>
						<BBField
							name="content"
							autoFocus
							required
							maxLength={20000}
							rows={6}
						/>
					</Row>
					<Row id="edit-news-tip">
						The recommended image width in a news post is 420 pixels.
					</Row>
				</IDPrefix.Provider>

				<Action>Submit!</Action>
				{Action.CANCEL}
			</Dialog>
		);

		if (dialog.canceled) {
			return;
		}

		const { data: newsPost } = await (api as StoryNewsAPI).post(
			`/stories/${story.id}/news`,
			dialog.values
		);

		if (!mountedRef.current) {
			return;
		}

		updateNewsPosts(newsPosts => {
			newsPosts.unshift(newsPost);
		});
	});

	const [notAllNewsLoaded, setNotAllNewsLoaded] = useState(
		// If the client initially received the maximum amount of news posts, then there may be more. On the other hand, if they received less, then we know we have all of them.
		initialNewsPosts.length === NEWS_POSTS_PER_REQUEST
	);
	/** A ref to whether news is currently being requested. */
	const newsLoadingRef = useRef(false);
	const newsElementRef = useRef<HTMLDivElement>(null as never);

	const checkIfNewsShouldBeFetched = useFunction(async () => {
		if (newsLoadingRef.current) {
			return;
		}

		const newsRect = newsElementRef.current.getBoundingClientRect();
		const newsStyle = window.getComputedStyle(newsElementRef.current);
		const newsPaddingBottom = +newsStyle.paddingBottom.slice(0, -2);
		const newsContentBottom = newsRect.bottom - newsPaddingBottom;

		// Check if the user has scrolled below the bottom of the news area's content.
		if (newsContentBottom < document.documentElement.clientHeight) {
			newsLoadingRef.current = true;

			// Fetch more news.
			const {
				data: {
					news: newNewsPosts,
					userCache: newUserCache
				}
			} = await (api as StoryNewsAPI).get(`/stories/${story.id}/news`, {
				params: {
					limit: NEWS_POSTS_PER_REQUEST,
					...newsPosts.length && {
						after: newsPosts[newsPosts.length - 1].id
					}
				}
			}).finally(() => {
				newsLoadingRef.current = false;
			});

			if (newNewsPosts.length < NEWS_POSTS_PER_REQUEST) {
				setNotAllNewsLoaded(false);
			}

			if (newNewsPosts.length === 0) {
				return;
			}

			newUserCache.forEach(cacheUser);

			updateNewsPosts(newsPosts => {
				newsPosts.push(...newNewsPosts);
			});
		}
	});

	useEffect(() => {
		if (notAllNewsLoaded) {
			const viewportListenerKey = addViewportListener(checkIfNewsShouldBeFetched);
			frameThrottler(viewportListenerKey).then(checkIfNewsShouldBeFetched);

			return () => {
				removeViewportListener(viewportListenerKey);
			};
		}

		// `newsPosts` must be a dependency here so that updating it calls `checkIfNewsShouldBeFetched` again without needing to change the viewport.
	}, [checkIfNewsShouldBeFetched, notAllNewsLoaded, newsPosts]);

	const deleteNewsPost = useFunction((newsPostID: string) => {
		updateNewsPosts(newsPosts => {
			const newsPostIndex = newsPosts.findIndex(({ id }) => id === newsPostID);

			newsPosts.splice(newsPostIndex, 1);
		});
	});

	const setNewsPost = useFunction((newsPost: ClientNewsPost) => {
		updateNewsPosts(newsPosts => {
			const newsPostIndex = newsPosts.findIndex(({ id }) => id === newsPost.id);

			newsPosts[newsPostIndex] = newsPost;
		});
	});

	return (
		<>
			{user && (
				story.owner === user.id
				|| story.editors.includes(user.id)
				|| hasPerms(user, Perm.WRITE)
			) && (
				<Row className="story-news-actions">
					<Button
						className="small"
						onClick={createNewsPost}
					>
						Create News Post
					</Button>
				</Row>
			)}
			{newsPosts.length === 0 && (
				// This can only appear to users with write perms on the story, since the `StoryNews` component is not rendered to users without perms when there are no news posts.
				<Row className="story-news-tip translucent">
					Since you have no news posts, your news section is hidden from readers.
				</Row>
			)}
			<Row
				className="story-news"
				ref={newsElementRef}
			>
				{newsPosts.map(newsPost => (
					<NewsPost
						key={newsPost.id}
						story={story}
						setNewsPost={setNewsPost}
						deleteNewsPost={deleteNewsPost}
					>
						{newsPost}
					</NewsPost>
				))}
			</Row>
		</>
	);
});

export default StoryNews;
