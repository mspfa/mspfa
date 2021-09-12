import './styles.module.scss';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import Timestamp from 'components/Timestamp';
import type { StoryLogListings } from 'lib/client/stories';
import type { HTMLAttributes } from 'react';
import { useMemo } from 'react';
import StoryPageLink from 'components/StoryPageLink';

export type StoryLogProps = {
	listings?: StoryLogListings
} & HTMLAttributes<HTMLDivElement>;

const StoryLog = ({ listings, children, className, ...props }: StoryLogProps) => (
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
					<StoryPageLink
						pageID={listing.id}
						title={sanitizeBBCode(listing.title, { removeBBTags: true })}
					>
						<BBCode alreadyParsed>
							{/* We must `sanitizeBBCode` before passing it in, or else this memo hook would be pointless as the sanitized value wouldn't be memoized. */}
							{sanitizeBBCode(listing.title, { keepHTMLTags: true })}
						</BBCode>
					</StoryPageLink>
				</div>
			))
		), [listings])}
	</div>
);

export default StoryLog;