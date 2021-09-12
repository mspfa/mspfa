import './styles.module.scss';
import BBCode from 'components/BBCode';
import parseBBCode from 'lib/client/parseBBCode';
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
						title={parseBBCode(listing.title, { removeBBTags: true })}
					>
						<BBCode keepHTMLTags>
							{listing.title}
						</BBCode>
					</StoryPageLink>
				</div>
			))
		), [listings])}
	</div>
);

export default StoryLog;