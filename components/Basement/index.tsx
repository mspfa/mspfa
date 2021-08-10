import './styles.module.scss';
import Button from 'components/Button';
import Row from 'components/Row';
import type { ClientStoryPage, PublicStory } from 'modules/client/stories';
import { useMobile } from 'modules/client/useMobile';
import { useCallback, useMemo, useState } from 'react';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import Timestamp from 'components/Timestamp';
import Link from 'components/Link';
import Label from 'components/Label';

/** The maximum number of pages which can be listed under the adventure's "Latest Pages" section. */
export const MAX_LATEST_PAGES = 45;

/** An array of objects, each containing data about one listing in the adventure's "Latest Pages" section.  */
export type LatestPages = Array<Pick<ClientStoryPage, 'id' | 'published' | 'title'>>;

export type BasementProps = {
	story: PublicStory,
	previewMode: boolean,
	latestPages: LatestPages
};

/** The area of the `StoryViewer` between the `footer` and `#copyright` elements. */
const Basement = ({ story, previewMode, latestPages }: BasementProps) => {
	// Default to `true` to avoid loading the side ad unnecessarily.
	const mobile = useMobile(true);

	// This state is the basement section which is currently selected.
	const [section, setSection] = useState<'info' | 'comments' | 'news'>('info');

	const sanitizedSidebarContent = useMemo(() => (
		sanitizeBBCode(story.sidebarContent, { html: true })
	), [story.sidebarContent]);

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

	return (
		<div id="basement">
			{section === 'info' && (
				<div id="sidebar" className="basement-section mid">
					<div className="basement-section-heading translucent-text">
						Latest Pages
					</div>
					<div id="latest-pages">
						<Label className="spaced">Latest Pages</Label>
						<Link
							className="spaced translucent-text"
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
				<Row>
					info, comments, or news here
				</Row>
			</div>
			{!mobile && (
				<div id="basement-wealth-dungeon" className="basement-section mid">
					<div className="basement-section-heading translucent-text">
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