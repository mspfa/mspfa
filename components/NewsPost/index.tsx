import './styles.module.scss';
import BBCode from 'components/BBCode';
import UserLink from 'components/Link/UserLink';
import Timestamp from 'components/Timestamp';
import type { ClientNews } from 'lib/client/news';
import React from 'react';
import EditButton from 'components/Button/EditButton';
import RemoveButton from 'components/Button/RemoveButton';
import { useUser } from 'lib/client/users';
import type { PublicStory } from 'lib/client/stories';
import { Perm } from 'lib/client/perms';
import useFunction from 'lib/client/useFunction';
import Dialog from 'lib/client/Dialog';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';

type StoryNewsPostAPI = APIClient<typeof import('pages/api/stories/[storyID]/news/[newsID]').default>;

export type NewsPostProps = {
	story: PublicStory,
	children: ClientNews,
	deleteNewsPost: (newsID: string) => void
};

const NewsPost = React.memo(({
	story,
	children: newsPost,
	deleteNewsPost
}: NewsPostProps) => {
	const user = useUser();

	const userIsEditor = !!user && (
		story.owner === user.id
		|| story.editors.includes(user.id)
	);

	const promptDelete = useFunction(async () => {
		if (!await Dialog.confirm({
			id: 'edit-news',
			title: 'Delete News Post',
			content: 'Are you sure you want to delete this news post?\n\nThis cannot be undone.'
		})) {
			return;
		}

		await (api as StoryNewsPostAPI).delete(`/stories/${story.id}/news/${newsPost.id}`);

		deleteNewsPost(newsPost.id);
	});

	return (
		<div className="news-post">
			<div className="news-post-actions">
				{(userIsEditor || (
					user
					&& !!(user.perms & Perm.sudoWrite)
				)) && (
					<EditButton
						title="Edit News Post"
					/>
				)}
				{(userIsEditor || (
					user
					&& !!(user.perms & Perm.sudoDelete)
				)) && (
					<RemoveButton
						title="Delete News Post"
						onClick={promptDelete}
					/>
				)}
			</div>
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
	);
});

export default NewsPost;