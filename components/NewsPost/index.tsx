import './styles.module.scss';
import BBCode from 'components/BBCode';
import UserLink from 'components/Link/UserLink';
import Timestamp from 'components/Timestamp';
import type { ClientNews } from 'lib/client/news';
import type { StoryID } from 'lib/server/stories';
import React from 'react';

export type NewsPostProps = {
	storyID: StoryID,
	children: ClientNews
};

const NewsPost = React.memo(({
	storyID,
	children: newsPost
}: NewsPostProps) => (
	<div className="news-post">
		<div className="news-post-heading">
			{'Posted on '}
			<Timestamp>{newsPost.posted}</Timestamp>
			{' by '}
			<UserLink>{newsPost.author}</UserLink>
		</div>
		<div className="news-post-content">
			<BBCode html>
				{newsPost.content}
			</BBCode>
		</div>
	</div>
));

export default NewsPost;