import './styles.module.scss';
import BBCode from 'components/BBCode';
import UserLink from 'components/Link/UserLink';
import Timestamp from 'components/Timestamp';
import type { ClientNewsPost } from 'lib/client/news';
import React from 'react';
import EditButton from 'components/Button/EditButton';
import RemoveButton from 'components/Button/RemoveButton';
import { useUser } from 'lib/client/reactContexts/UserContext';
import type { PublicStory } from 'lib/client/stories';
import { Perm } from 'lib/client/perms';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'lib/client/Dialog';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import IDPrefix from 'lib/client/reactContexts/IDPrefix';
import Label from 'components/Label';
import BBField from 'components/BBCode/BBField';

type StoryNewsPostAPI = APIClient<typeof import('pages/api/stories/[storyID]/news/[newsPostID]').default>;

export type NewsPostProps = {
	story: PublicStory,
	children: ClientNewsPost,
	setNewsPost: (newsPost: ClientNewsPost) => void,
	deleteNewsPost: (newsID: string) => void
};

const NewsPost = React.memo(({
	story,
	children: newsPost,
	setNewsPost,
	deleteNewsPost
}: NewsPostProps) => {
	const user = useUser();

	const userIsEditor = !!user && (
		story.owner === user.id
		|| story.editors.includes(user.id)
	);

	const promptEdit = useFunction(async () => {
		const dialog = new Dialog({
			id: 'edit-news',
			title: 'Edit News Post',
			initialValues: {
				content: newsPost.content
			},
			content: (
				<IDPrefix.Provider value="news">
					<Label block htmlFor="news-field-content">
						Content
					</Label>
					<BBField
						name="content"
						autoFocus
						required
						maxLength={20000}
						rows={6}
					/>
				</IDPrefix.Provider>
			),
			actions: [
				{ label: 'Save', autoFocus: false },
				'Cancel'
			]
		});

		if (!(await dialog)?.submit) {
			return;
		}

		const { data: newNewsPost } = await (api as StoryNewsPostAPI).patch(
			`/stories/${story.id}/news/${newsPost.id}`,
			dialog.form!.values
		);

		setNewsPost(newNewsPost);
	});

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
		<div
			className={
				`news-post by-${newsPost.author}`
				+ (
					user?.id === newsPost.author
						? ' by-self'
						: ''
				)
			}
		>
			<div className="news-post-actions">
				{(userIsEditor || (
					user
					&& !!(user.perms & Perm.sudoWrite)
				)) && (
					<EditButton
						title="Edit News Post"
						onClick={promptEdit}
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
				<BBCode keepHTMLTags>
					{newsPost.content}
				</BBCode>
			</div>
		</div>
	);
});

export default NewsPost;