import './styles.module.scss';
import Button from 'components/Button';
import Row from 'components/Row';
import type { StoryLogListings, PublicStory } from 'lib/client/stories';
import { storyStatusNames } from 'lib/client/stories';
import { useMobile } from 'lib/client/useMobile';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import useFunction from 'lib/client/useFunction';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import Timestamp from 'components/Timestamp';
import Link from 'components/Link';
import Label from 'components/Label';
import IconImage from 'components/IconImage';
import FavButton from 'components/Button/FavButton';
import PageCount from 'components/Icon/PageCount';
import EditButton from 'components/Button/EditButton';
import { useUser } from 'lib/client/users';
import { Perm } from 'lib/client/perms';
import UserLink from 'components/Link/UserLink';
import { uniq } from 'lodash';
import type { StoryPageID } from 'lib/server/stories';
import StoryTagLinkContainer from 'components/StoryTagLink/StoryTagLinkContainer';
import StoryTagLink from 'components/StoryTagLink';
import StoryLog from 'components/StoryLog';
import Dialog from 'lib/client/Dialog';
import BBField from 'components/BBCode/BBField';
import IDPrefix from 'lib/client/IDPrefix';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { ClientNews } from 'lib/client/news';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import { useUserCache } from 'lib/client/UserCache';
import frameThrottler from 'lib/client/frameThrottler';
import NewsPost from 'components/NewsPost';

type StoryNewsAPI = APIClient<typeof import('pages/api/stories/[storyID]/news').default>;

/** The maximum number of pages which can be listed under the adventure's "Latest Pages" section. */
export const MAX_LATEST_PAGES = 45;

/** The maximum number of news posts to request each time. */
export const NEWS_POSTS_PER_REQUEST = 3;

export type BasementProps = {
	story: PublicStory,
	pageID: StoryPageID,
	previewMode: boolean,
	latestPages: StoryLogListings,
	newsPosts: ClientNews[]
};

/** The area of the `StoryViewer` between the `footer` and `#copyright` elements. */
const Basement = ({
	story,
	pageID,
	previewMode,
	latestPages,
	newsPosts: initialNewsPosts
}: BasementProps) => {
	const user = useUser();

	const { cacheUser } = useUserCache();

	const writePerms = !!user && (
		story.owner === user.id
		|| story.editors.includes(user.id)
		|| !!(user.perms & Perm.sudoWrite)
	);

	// Default to `true` to avoid loading the side ad unnecessarily.
	const mobile = useMobile(true);

	// This state is the basement section which is currently selected.
	const [section, setSection] = useState<'news' | 'comments'>('news');

	const sanitizedSidebarContent = useMemo(() => (
		sanitizeBBCode(story.sidebarContent, { html: true })
	), [story.sidebarContent]);

	const sanitizedDescription = useMemo(() => (
		sanitizeBBCode(story.description, { html: true })
	), [story.description]);

	// Hide latest pages by default to prevent spoilers from page titles.
	const [latestPagesShown, setLatestPagesShown] = useState(false);

	const toggleLatestPagesShown = useFunction(() => {
		setLatestPagesShown(latestPagesShown => !latestPagesShown);
	});

	const editorLinks = uniq([story.owner, ...story.editors]).map((userID, i) => (
		<Fragment key={userID}>
			{i !== 0 && ', '}
			<UserLink>
				{userID}
			</UserLink>
		</Fragment>
	));

	const [newsPosts, setNewsPosts] = useState(initialNewsPosts);

	const createNewsPost = useFunction(async () => {
		const dialog = new Dialog({
			id: 'edit-news',
			title: 'Create News Post',
			initialValues: {
				content: ''
			},
			content: (
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
			),
			actions: [
				{ label: 'Post!', autoFocus: false },
				{ label: 'Cancel' }
			]
		});

		if (!(await dialog)?.submit) {
			return;
		}

		const { data: newsPost } = await (api as StoryNewsAPI).post(
			`/stories/${story.id}/news`,
			dialog.form!.values
		);

		setNewsPosts(newsPosts => [
			newsPost,
			...newsPosts
		]);
	});

	const [notAllNewsLoaded, setNotAllNewsLoaded] = useState(
		// If the client initially received the maximum amount of news posts, then there may be more. On the other hand, if they received less, then we know we have all of them.
		initialNewsPosts.length === NEWS_POSTS_PER_REQUEST
	);
	/** Whether news is currently being requested. */
	const newsLoadingRef = useRef(false);
	const newsElementRef = useRef<HTMLDivElement>(null);

	const checkIfNewsShouldBeFetched = useFunction(async () => {
		if (newsLoadingRef.current) {
			return;
		}

		const newsRect = newsElementRef.current!.getBoundingClientRect();
		const newsStyle = window.getComputedStyle(newsElementRef.current!);
		const newsPaddingBottom = +newsStyle.paddingBottom.slice(0, -2);
		const newsContentBottom = newsRect.bottom - newsPaddingBottom;

		// Check if the user has scrolled below the bottom of the news's content.
		if (newsContentBottom < document.documentElement.clientHeight) {
			newsLoadingRef.current = true;

			const { data: { news, userCache } } = await (api as StoryNewsAPI).get(`/stories/${story.id}/news`, {
				params: {
					limit: NEWS_POSTS_PER_REQUEST,
					...newsPosts.length && {
						before: newsPosts[newsPosts.length - 1].id
					}
				}
			}).finally(() => {
				newsLoadingRef.current = false;
			});

			if (news.length < NEWS_POSTS_PER_REQUEST) {
				setNotAllNewsLoaded(false);
			}

			if (news.length === 0) {
				return;
			}

			userCache.forEach(cacheUser);

			setNewsPosts(newsPosts => [
				...newsPosts,
				...news
			]);
		}
	});

	useEffect(() => {
		if (section === 'news' && notAllNewsLoaded) {
			const _viewportListener = addViewportListener(checkIfNewsShouldBeFetched);
			frameThrottler(_viewportListener).then(checkIfNewsShouldBeFetched);

			return () => {
				removeViewportListener(_viewportListener);
			};
		}

		// `newsPosts` must be a dependency here so that updating it calls `checkIfNewsShouldBeFetched` again without needing to change the viewport.
	}, [checkIfNewsShouldBeFetched, section, notAllNewsLoaded, newsPosts]);

	const deleteNewsPost = useFunction((newsID: string) => {
		setNewsPosts(newsPosts => {
			const newsIndex = newsPosts.findIndex(({ id }) => id === newsID);

			return [
				...newsPosts.slice(0, newsIndex),
				...newsPosts.slice(newsIndex + 1, newsPosts.length)
			];
		});
	});

	const setNewsPost = useFunction((newsPost: ClientNews) => {
		setNewsPosts(newsPosts => {
			const newsIndex = newsPosts.findIndex(({ id }) => id === newsPost.id);

			return [
				...newsPosts.slice(0, newsIndex),
				newsPost,
				...newsPosts.slice(newsIndex + 1, newsPosts.length)
			];
		});
	});

	return (
		<div id="basement">
			<div id="sidebar" className="basement-section mid">
				<div className="basement-section-heading translucent">
					Latest Pages
				</div>
				<StoryLog
					id="latest-pages"
					story={story}
					listings={latestPagesShown ? latestPages : undefined}
					previewMode={previewMode}
				>
					<Label className="spaced">
						Latest Pages
					</Label>
					<Link
						className="spaced translucent"
						onClick={toggleLatestPagesShown}
					>
						{latestPagesShown ? '(Hide)' : '(Show)'}
					</Link>
				</StoryLog>
				{latestPagesShown && (
					<div id="view-all-pages-link-container">
						<Link href={`/s/${story.id}/log${previewMode ? '?preview=1' : ''}`}>
							View All Pages
						</Link>
					</div>
				)}
				{story.sidebarContent && (
					<div id="sidebar-content">
						<BBCode alreadySanitized>
							{sanitizedSidebarContent}
						</BBCode>
					</div>
				)}
			</div>
			<div id="basement-content" className="basement-section front">
				<Row id="story-meta">
					<IconImage
						id="story-icon"
						src={story.icon}
						alt={`${story.title}'s Icon`}
					/>
					<div id="story-details">
						<div id="story-title" className="story-details-section translucent">
							{story.title}
						</div>
						<div id="story-stats" className="story-details-section">
							<span className="story-status spaced">
								{storyStatusNames[story.status]}
							</span>
							{writePerms && (
								<EditButton
									className="spaced"
									href={`/s/${story.id}/edit/p#p${pageID}`}
									title="Edit Adventure"
								/>
							)}
							<FavButton className="spaced" storyID={story.id}>
								{story.favCount}
							</FavButton>
							<PageCount className="spaced">
								{story.pageCount}
							</PageCount>
						</div>
						<div id="story-anniversary" className="story-details-section">
							<Label className="spaced">
								Created
							</Label>
							<Timestamp className="spaced">
								{Math.min(
									// Use the date of `story.anniversary` but the time of `story.created` so that the relative time isn't inaccurate when the date is very recent.
									new Date(story.created).setFullYear(
										story.anniversary.year,
										story.anniversary.month,
										story.anniversary.day
									),
									// Ensure the time of `story.created` isn't in the future in the case that `story.anniversary` is today.
									Date.now()
								)}
							</Timestamp>
						</div>
						<div id="story-author-container" className="story-details-section">
							<Label className="spaced">
								{`Author${editorLinks.length === 1 ? '' : 's'}`}
							</Label>
							<span className="spaced">
								{editorLinks}
							</span>
						</div>
					</div>
				</Row>
				<Row id="story-description">
					<BBCode alreadySanitized>
						{sanitizedDescription}
					</BBCode>
				</Row>
				<StoryTagLinkContainer id="story-tags" className="row">
					{story.tags.map((tag, i) => (
						<Fragment key={tag}>
							{i !== 0 && ' '}
							<StoryTagLink>{tag}</StoryTagLink>
						</Fragment>
					))}
				</StoryTagLinkContainer>
				<Row id="basement-actions">
					<Button
						className="small"
						disabled={section === 'news'}
						onClick={
							useFunction(() => {
								setSection('news');
							})
						}
					>
						News
					</Button>
					<Button
						className="small"
						disabled={section === 'comments'}
						onClick={
							useFunction(() => {
								setSection('comments');
							})
						}
					>
						Comments
					</Button>
				</Row>
				{section === 'news' ? (
					<>
						{writePerms && (
							<Row id="story-news-actions">
								<Button
									className="small"
									onClick={createNewsPost}
								>
									Create News Post
								</Button>
							</Row>
						)}
						<Row
							id="story-news"
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
				) : (
					// If this point is reached, `section === 'comments'`.
					<Row id="story-comments">
						comments here
					</Row>
				)}
			</div>
			{!mobile && (
				<div id="basement-wealth-dungeon" className="basement-section mid">
					<div className="basement-section-heading translucent">
						Ads
					</div>
					<div className="wealth-spawner-cage">
						{/* TODO: Insert wealth spawner here. */}
					</div>
					<div className="wealth-spawner-cage">
						{/* TODO: Insert wealth spawner here. */}
					</div>
				</div>
			)}
		</div>
	);
};

export default Basement;