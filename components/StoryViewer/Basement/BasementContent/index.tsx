import './styles.module.scss';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import BBField from 'components/BBCode/BBField';
import Button from 'components/Button';
import EditButton from 'components/Button/EditButton';
import FavButton from 'components/Button/FavButton';
import PageCount from 'components/Icon/PageCount';
import IconImage from 'components/IconImage';
import Label from 'components/Label';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import NewsPost from 'components/NewsPost';
import Row from 'components/Row';
import StoryTagLink from 'components/StoryTagLink';
import StoryTagLinkContainer from 'components/StoryTagLink/StoryTagLinkContainer';
import Timestamp from 'components/Timestamp';
import type { FormikHelpers } from 'formik';
import { Formik, Form } from 'formik';
import { useLeaveConfirmation } from 'lib/client/forms';
import IDPrefix from 'lib/client/IDPrefix';
import { storyStatusNames } from 'lib/client/stories';
import useFunction from 'lib/client/useFunction';
import type { ChangeEvent } from 'react';
import React, { Fragment, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CommentaryShownContext, PageIDContext, StoryViewerContext } from 'components/StoryViewer';
import { useUser } from 'lib/client/users';
import { Perm } from 'lib/client/perms';
import UserLink from 'components/Link/UserLink';
import { uniq } from 'lodash';
import Dialog from 'lib/client/Dialog';
import type { APIClient } from 'lib/client/api';
import frameThrottler from 'lib/client/frameThrottler';
import { addViewportListener, removeViewportListener } from 'lib/client/viewportListener';
import type { ClientNews } from 'lib/client/news';
import { useUserCache } from 'lib/client/UserCache';
import api from 'lib/client/api';

type StoryNewsAPI = APIClient<typeof import('pages/api/stories/[storyID]/news').default>;

/** The maximum number of news posts to request each time. */
export const NEWS_POSTS_PER_REQUEST = 3;

const BasementContent = () => {
	const {
		story,
		newsPosts: initialNewsPosts
	} = useContext(StoryViewerContext)!;

	const pageID = useContext(PageIDContext);

	const [commentaryShown, setCommentaryShown] = useContext(CommentaryShownContext)!;

	const onChangeCommentaryShown = useFunction((event: ChangeEvent<HTMLInputElement>) => {
		setCommentaryShown(event.target.checked);
	});

	const { cacheUser } = useUserCache();

	// This state is the basement section which is currently open.
	const [basementSection, setBasementSection] = useState<'news' | 'comments' | 'options'>('news');

	const user = useUser();

	const writePerms = !!user && (
		story.owner === user.id
		|| story.editors.includes(user.id)
		|| !!(user.perms & Perm.sudoWrite)
	);

	const editorLinks = uniq([story.owner, ...story.editors]).map((userID, i) => (
		<Fragment key={userID}>
			{i !== 0 && ', '}
			<UserLink>
				{userID}
			</UserLink>
		</Fragment>
	));

	const sanitizedDescription = useMemo(() => (
		sanitizeBBCode(story.description, { html: true })
	), [story.description]);

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
				{ label: 'Submit!', autoFocus: false },
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
		if (basementSection === 'news' && notAllNewsLoaded) {
			const _viewportListener = addViewportListener(checkIfNewsShouldBeFetched);
			frameThrottler(_viewportListener).then(checkIfNewsShouldBeFetched);

			return () => {
				removeViewportListener(_viewportListener);
			};
		}

		// `newsPosts` must be a dependency here so that updating it calls `checkIfNewsShouldBeFetched` again without needing to change the viewport.
	}, [checkIfNewsShouldBeFetched, basementSection, notAllNewsLoaded, newsPosts]);

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

	const openComments = useFunction(() => {
		setBasementSection('comments');
	});

	const onSubmitComment = useFunction(async (
		values: { content: string },
		formikHelpers: FormikHelpers<{ content: string }>
	) => {
		console.log(values.content);

		formikHelpers.setFieldValue('content', '');
	});

	return (
		<div className="basement-section basement-content front">
			<Row className="story-meta">
				<IconImage
					className="story-icon"
					src={story.icon}
					alt={`${story.title}'s Icon`}
				/>
				<div className="story-details">
					<div className="story-title translucent">
						{story.title}
					</div>
					<div className="story-stats">
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
					<div className="story-anniversary">
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
					<div className="story-author-container">
						<Label className="spaced">
							{`Author${editorLinks.length === 1 ? '' : 's'}`}
						</Label>
						<span className="spaced">
							{editorLinks}
						</span>
					</div>
				</div>
			</Row>
			<Row className="story-description">
				<BBCode alreadySanitized>
					{sanitizedDescription}
				</BBCode>
			</Row>
			<Row className="story-tags">
				<StoryTagLinkContainer>
					{story.tags.map((tag, i) => (
						<Fragment key={tag}>
							{i !== 0 && ' '}
							<StoryTagLink>{tag}</StoryTagLink>
						</Fragment>
					))}
				</StoryTagLinkContainer>
			</Row>
			<Row className="basement-actions">
				<Button
					className="small"
					disabled={basementSection === 'news'}
					onClick={
						useFunction(() => {
							setBasementSection('news');
						})
					}
				>
					News
				</Button>
				{story.allowComments && (
					<Button
						className="small"
						disabled={basementSection === 'comments'}
						onClick={openComments}
					>
						Comments
					</Button>
				)}
				<Button
					className="small"
					disabled={basementSection === 'options'}
					onClick={
						useFunction(() => {
							setBasementSection('options');
						})
					}
				>
					Options
				</Button>
			</Row>
			{basementSection === 'news' ? (
				<>
					{writePerms && (
						<Row className="story-news-actions">
							<Button
								className="small"
								onClick={createNewsPost}
							>
								Create News Post
							</Button>
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
			) : basementSection === 'comments' ? (
				<IDPrefix.Provider value="story-comments">
					<Formik
						initialValues={{ content: '' }}
						onSubmit={onSubmitComment}
					>
						{function CommentForm({ dirty, isSubmitting }) {
							useLeaveConfirmation(dirty);

							return (
								<Form className="row story-comments-form">
									<Label block htmlFor="story-comments-field-content">
										Post a Comment
									</Label>
									<BBField
										name="content"
										required
										maxLength={2000}
										rows={3}
										disabled={isSubmitting}
									/>
									<div className="story-comments-form-actions">
										<Button
											type="submit"
											className="small"
											disabled={isSubmitting}
										>
											Submit!
										</Button>
									</div>
								</Form>
							);
						}}
					</Formik>
					<Row className="story-comments">
						comments here
					</Row>
				</IDPrefix.Provider>
			) : (
				// If this point is reached, `basementSection === 'options'`.
				<Row className="story-options">
					<LabeledGrid>
						<LabeledGridRow label="Show Commentary" htmlFor="field-commentary-shown">
							<input
								type="checkbox"
								id="field-commentary-shown"
								checked={commentaryShown}
								onChange={onChangeCommentaryShown}
							/>
						</LabeledGridRow>
					</LabeledGrid>
				</Row>
			)}
		</div>
	);
};

export default BasementContent;