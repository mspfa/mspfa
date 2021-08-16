import './styles.module.scss';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import Link from 'components/Link';
import Timestamp from 'components/Timestamp';
import type { PublicStory, StoryLogListings } from 'lib/client/stories';
import type { HTMLAttributes } from 'react';
import { useMemo } from 'react';

export type StoryLogProps = {
	story: PublicStory,
	listings?: StoryLogListings,
	previewMode?: boolean
} & HTMLAttributes<HTMLDivElement>;

const StoryLog = ({ story, listings, children, previewMode, className, ...props }: StoryLogProps) => (
	<div
		className={`story-log${className ? ` ${className}` : ''}`}
		{...props}
	>
		{children}
		{useMemo(() => listings && (
			listings.map(listing => (
				<div
					key={listing.id}
					className="story-log-listing"
				>
					<span className="story-log-timestamp-container">
						{listing.published === undefined ? (
							'Draft'
						) : (
							<Timestamp short relative>
								{listing.published}
							</Timestamp>
						)}
					</span>
					<Link
						shallow
						href={`/?s=${story.id}&p=${listing.id}${previewMode ? '&preview=1' : ''}`}
						title={sanitizeBBCode(listing.title, { noBB: true })}
					>
						<BBCode alreadySanitized>
							{/* We must `sanitizeBBCode` before passing it in, or else this memo hook would be pointless as the sanitized value wouldn't be memoized. */}
							{sanitizeBBCode(listing.title, { html: true })}
						</BBCode>
					</Link>
				</div>
			))
		), [listings, previewMode, story.id])}
	</div>
);

export default StoryLog;