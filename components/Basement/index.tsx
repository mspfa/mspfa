import './styles.module.scss';
import Button from 'components/Button';
import Row from 'components/Row';
import type { ClientStoryPage, PublicStory } from 'modules/client/stories';
import { storyStatusNames } from 'modules/client/stories';
import { useMobile } from 'modules/client/useMobile';
import { Fragment, useCallback, useMemo, useState } from 'react';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import Timestamp from 'components/Timestamp';
import Link from 'components/Link';
import Label from 'components/Label';
import IconImage from 'components/IconImage';
import FavButton from 'components/Button/FavButton';
import PageCount from 'components/Icon/PageCount';
import EditButton from 'components/Button/EditButton';
import { useUser } from 'modules/client/users';
import { Perm } from 'modules/client/perms';
import UserLink from 'components/Link/UserLink';
import { uniq } from 'lodash';
import type { StoryPageID } from 'modules/server/stories';
import StoryTagLinkContainer from 'components/StoryTagLink/StoryTagLinkContainer';
import StoryTagLink from 'components/StoryTagLink';

/** The maximum number of pages which can be listed under the adventure's "Latest Pages" section. */
export const MAX_LATEST_PAGES = 45;

/** An array of objects, each containing data about one listing in the adventure's "Latest Pages" section.  */
export type LatestPages = Array<Pick<ClientStoryPage, 'id' | 'published' | 'title'>>;

export type BasementProps = {
	story: PublicStory,
	pageID: StoryPageID,
	previewMode: boolean,
	latestPages: LatestPages
};

/** The area of the `StoryViewer` between the `footer` and `#copyright` elements. */
const Basement = ({ story, pageID, previewMode, latestPages }: BasementProps) => {
	const user = useUser();

	// Default to `true` to avoid loading the side ad unnecessarily.
	const mobile = useMobile(true);

	// This state is the basement section which is currently selected.
	const [section, setSection] = useState<'info' | 'comments' | 'news'>('info');

	const sanitizedSidebarContent = useMemo(() => (
		sanitizeBBCode(story.sidebarContent, { html: true })
	), [story.sidebarContent]);

	const sanitizedDescription = useMemo(() => (
		sanitizeBBCode(story.description, { html: true })
	), [story.description]);

	// Hide latest pages by default to prevent spoilers from page titles.
	const [latestPagesShown, setLatestPagesShown] = useState(false);

	const toggleLatestPagesShown = useCallback(() => {
		setLatestPagesShown(latestPagesShown => !latestPagesShown);
	}, []);

	const latestPagesNode = useMemo(() => latestPagesShown && (
		latestPages.map(latestPage => (
			<div
				key={latestPage.id}
				className="latest-pages-listing"
			>
				{latestPage.published === undefined ? (
					'Draft - '
				) : (
					<>
						<Timestamp short relative>
							{latestPage.published}
						</Timestamp>
						{' - '}
					</>
				)}
				<Link
					shallow
					href={`/?s=${story.id}&p=${latestPage.id}${previewMode ? '&preview=1' : ''}`}
				>
					<BBCode alreadySanitized>
						{/* We must `sanitizeBBCode` before passing it in, or else this memo hook would be pointless as the sanitized value wouldn't be memoized. */}
						{sanitizeBBCode(latestPage.title, { html: true })}
					</BBCode>
				</Link>
			</div>
		))
	), [latestPagesShown, latestPages, previewMode, story.id]);

	const editorLinks = uniq([story.owner, ...story.editors]).map((userID, i) => (
		<Fragment key={userID}>
			{i !== 0 && ', '}
			<UserLink>
				{userID}
			</UserLink>
		</Fragment>
	));

	return (
		<div id="basement">
			{section === 'info' && (
				<div id="sidebar" className="basement-section mid">
					<div className="basement-section-heading translucent">
						Latest Pages
					</div>
					<div id="latest-pages">
						<Label className="spaced">
							Latest Pages
						</Label>
						<Link
							className="spaced translucent"
							onClick={toggleLatestPagesShown}
						>
							{latestPagesShown ? '(Hide)' : '(Show)'}
						</Link>
						{latestPagesNode}
					</div>
					{latestPagesShown && (
						<div id="view-all-pages-link-container">
							<Link href={`/s/${story.id}/log`}>
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
			)}
			<div id="basement-content" className="basement-section front">
				<Row id="basement-actions">
					<Button
						className="small"
						disabled={section === 'info'}
						onClick={
							useCallback(() => {
								setSection('info');
							}, [])
						}
					>
						Info
					</Button>
					<Button
						className="small"
						disabled={section === 'comments'}
						onClick={
							useCallback(() => {
								setSection('comments');
							}, [])
						}
					>
						Comments
					</Button>
					<Button
						className="small"
						disabled={section === 'news'}
						onClick={
							useCallback(() => {
								setSection('news');
							}, [])
						}
					>
						News
					</Button>
				</Row>
				{section === 'info' ? (
					<>
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
									{user && (
										story.owner === user.id
										|| story.editors.includes(user.id)
										|| !!(user.perms & Perm.sudoRead)
									) && (
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
										{story.created}
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
						<StoryTagLinkContainer>
							{story.tags.map((tag, i) => (
								<Fragment key={tag}>
									{i !== 0 && ' '}
									<StoryTagLink>{tag}</StoryTagLink>
								</Fragment>
							))}
						</StoryTagLinkContainer>
					</>
				) : section === 'comments' ? (
					<Row>
						comments here
					</Row>
				) : (
					// If this point is reached, `section === 'news'`.
					<Row>
						news here
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