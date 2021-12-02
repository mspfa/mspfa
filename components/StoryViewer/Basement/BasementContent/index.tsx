import BBCode from 'components/BBCode';
import Button from 'components/Button';
import IconImage from 'components/IconImage';
import Label from 'components/Label';
import Row from 'components/Row';
import StoryTagLink from 'components/StoryTagLink';
import InconspicuousDiv from 'components/InconspicuousDiv';
import Timestamp from 'components/Timestamp';
import useFunction from 'lib/client/reactHooks/useFunction';
import React, { Fragment, useContext, useState } from 'react';
import { PageIDContext, StoryViewerContext } from 'components/StoryViewer';
import { useUser } from 'lib/client/reactContexts/UserContext';
import { Perm } from 'lib/client/perms';
import UserLink from 'components/Link/UserLink';
import { uniq } from 'lodash';
import StoryNews from 'components/StoryViewer/Basement/BasementContent/StoryNews';
import StoryComments from 'components/StoryViewer/Basement/BasementContent/StoryComments';
import StoryMore from 'components/StoryViewer/Basement/BasementContent/StoryMore';
import StoryStats from 'components/StoryStats';

const BasementContent = React.memo(() => {
	const {
		story,
		newsPosts: initialNewsPosts
	} = useContext(StoryViewerContext)!;

	const pageID = useContext(PageIDContext);

	const user = useUser();

	const editorLinks = uniq([story.owner, ...story.editors]).map((userID, i) => (
		<Fragment key={userID}>
			{i !== 0 && ', '}
			<UserLink>
				{userID}
			</UserLink>
		</Fragment>
	));

	const showNews = initialNewsPosts.length !== 0 || (
		user && (
			story.owner === user.id
			|| story.editors.includes(user.id)
			|| !!(user.perms & Perm.sudoWrite)
		)
	);

	// This state is the basement content section which is currently open.
	const [openSection, setOpenSection] = useState<undefined | 'news' | 'comments' | 'more'>(
		showNews ? 'news' : undefined
	);

	const openNews = useFunction(() => {
		setOpenSection('news');
	});

	const openComments = useFunction(() => {
		setOpenSection('comments');
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
					<StoryStats editPageID={pageID}>
						{story}
					</StoryStats>
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
				<BBCode keepHTMLTags>
					{story.description}
				</BBCode>
			</Row>
			<Row className="story-tags">
				<InconspicuousDiv>
					{story.tags.map((tag, i) => (
						<Fragment key={tag}>
							{i !== 0 && ' '}
							<StoryTagLink>{tag}</StoryTagLink>
						</Fragment>
					))}
				</InconspicuousDiv>
			</Row>
			<Row className="basement-actions">
				{showNews && (
					<Button
						className="small"
						disabled={openSection === 'news'}
						onClick={openNews}
					>
						News
					</Button>
				)}
				{(
					story.allowComments
					// Disallow opening comments from a page which doesn't exist.
					&& pageID
				) && (
					<Button
						className="small"
						disabled={openSection === 'comments'}
						onClick={openComments}
					>
						Comments
					</Button>
				)}
				<Button
					className="small"
					disabled={openSection === 'more'}
					onClick={
						useFunction(() => {
							setOpenSection('more');
						})
					}
				>
					More
				</Button>
			</Row>
			{openSection === 'news' ? (
				<StoryNews />
			) : openSection === 'comments' ? (
				// Don't render `StoryComments` if viewing a page which doesn't exist.
				pageID && <StoryComments />
			) : openSection === 'more' && (
				<StoryMore />
			)}
		</div>
	);
});

export default BasementContent;