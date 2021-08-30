import './styles.module.scss';
import BBCode, { sanitizeBBCode } from 'components/BBCode';
import Link from 'components/Link';
import Timestamp from 'components/Timestamp';
import type { PublicStory, StoryLogListings } from 'lib/client/stories';
import type { HTMLAttributes } from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/router';

export type StoryLogProps = {
	story: PublicStory,
	listings?: StoryLogListings
} & HTMLAttributes<HTMLDivElement>;

const StoryLog = ({ story, listings, children, className, ...props }: StoryLogProps) => {
	const router = useRouter();

	const previewMode = 'preview' in router;

	return (
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
							href={`/?s=${story.id}&p=${listing.id}${previewMode ? '&preview=1' : ''}`}
							shallow
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
};

export default StoryLog;