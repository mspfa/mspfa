import './styles.module.scss';
import Button from 'components/Button';
import Row from 'components/Row';
import type { StoryLogListings, PublicStory } from 'lib/client/stories';
import { storyStatusNames } from 'lib/client/stories';
import { useMobile } from 'lib/client/useMobile';
import { Fragment, useMemo, useState } from 'react';
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

/** The maximum number of pages which can be listed under the adventure's "Latest Pages" section. */
export const MAX_LATEST_PAGES = 45;

export type BasementProps = {
	story: PublicStory,
	pageID: StoryPageID,
	previewMode: boolean,
	latestPages: StoryLogListings
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

	return (
		<div id="basement">
			{section === 'info' && (
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
			)}
			<div id="basement-content" className="basement-section front">
				<Row id="basement-actions">
					<Button
						className="small"
						disabled={section === 'info'}
						onClick={
							useFunction(() => {
								setSection('info');
							})
						}
					>
						Info
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