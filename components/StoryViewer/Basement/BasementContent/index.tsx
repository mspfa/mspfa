import BBCode, { sanitizeBBCode } from 'components/BBCode';
import Button from 'components/Button';
import EditButton from 'components/Button/EditButton';
import FavButton from 'components/Button/FavButton';
import PageCount from 'components/Icon/PageCount';
import IconImage from 'components/IconImage';
import Label from 'components/Label';
import Row from 'components/Row';
import StoryTagLink from 'components/StoryTagLink';
import InconspicuousDiv from 'components/InconspicuousDiv';
import Timestamp from 'components/Timestamp';
import { storyStatusNames } from 'lib/client/stories';
import useFunction from 'lib/client/useFunction';
import React, { Fragment, useContext, useMemo, useState } from 'react';
import { PageIDContext, StoryViewerContext } from 'components/StoryViewer';
import { useUser } from 'lib/client/users';
import { Perm } from 'lib/client/perms';
import UserLink from 'components/Link/UserLink';
import { uniq } from 'lodash';
import StoryNews from 'components/StoryViewer/Basement/BasementContent/StoryNews';
import StoryComments from 'components/StoryViewer/Basement/BasementContent/StoryComments';
import StoryOptions from 'components/StoryViewer/Basement/BasementContent/StoryOptions';

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
	const [openSection, setOpenSection] = useState<undefined | 'news' | 'comments' | 'options'>(
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
					<div className="story-stats">
						<span className="story-status spaced">
							{storyStatusNames[story.status]}
						</span>
						{user && (
							story.owner === user.id
							|| story.editors.includes(user.id)
							|| !!(user.perms & Perm.sudoWrite)
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
					{
						useMemo(() => (
							sanitizeBBCode(story.description, { html: true })
						), [story.description])
					}
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
				{story.allowComments && (
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
					disabled={openSection === 'options'}
					onClick={
						useFunction(() => {
							setOpenSection('options');
						})
					}
				>
					Options
				</Button>
			</Row>
			{openSection === 'news' ? (
				<StoryNews />
			) : openSection === 'comments' ? (
				<StoryComments />
			) : openSection === 'options' && (
				<StoryOptions />
			)}
		</div>
	);
});

export default BasementContent;