import './styles.module.scss';
import StoryLog from 'components/StoryLog';
import React, { useContext, useMemo, useState } from 'react';
import { PreviewModeContext, StoryViewerContext } from 'components/StoryViewer';
import Label from 'components/Label';
import Link from 'components/Link';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import useFunction from 'lib/client/useFunction';

/** The maximum number of pages which can be listed under the adventure's "Latest Pages" section. */
export const MAX_LATEST_PAGES = 45;

const BasementSidebar = React.memo(() => {
	const { story, latestPages } = useContext(StoryViewerContext)!;

	const previewMode = useContext(PreviewModeContext)!;

	const sanitizedSidebarContent = useMemo(() => (
		sanitizeBBCode(story.sidebarContent, { html: true })
	), [story.sidebarContent]);

	// Hide latest pages by default to prevent spoilers from page titles.
	const [latestPagesShown, setLatestPagesShown] = useState(false);

	const toggleLatestPagesShown = useFunction(() => {
		setLatestPagesShown(latestPagesShown => !latestPagesShown);
	});

	return (
		<div className="basement-section basement-sidebar mid">
			<div className="basement-section-heading translucent">
				Latest Pages
			</div>
			<StoryLog
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
				<div className="story-log-link-container">
					<Link href={`/s/${story.id}/log${previewMode ? '?preview=1' : ''}`}>
						View All Pages
					</Link>
				</div>
			)}
			<div className="basement-sidebar-content">
				{story.sidebarContent && (
					<BBCode alreadySanitized>
						{sanitizedSidebarContent}
					</BBCode>
				)}
			</div>
		</div>
	);
});

export default BasementSidebar;