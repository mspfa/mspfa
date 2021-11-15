import './styles.module.scss';
import { withErrorPage } from 'lib/client/errors';
import { Perm } from 'lib/client/perms';
import type { ClientStoryPage, PublicStory } from 'lib/client/stories';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import { withStatusCode } from 'lib/server/errors';
import { getPublicStory, getStoryByUnsafeID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import Page from 'components/Page';
import Section from 'components/Section';
import { Field, Form, Formik } from 'formik';
import { useRouter } from 'next/router';
import useFunction from 'lib/client/reactHooks/useFunction';
import Button from 'components/Button';
import Label from 'components/Label';
import parseBBCode from 'lib/client/parseBBCode';
import Timestamp from 'components/Timestamp';
import type { ReactNode } from 'react';
import { Fragment } from 'react';
import StoryPageLink from 'components/StoryPageLink';
import PreviewModeContext from 'lib/client/PreviewModeContext';
import StoryIDContext from 'lib/client/StoryIDContext';

type StorySearchResults = Array<Pick<ClientStoryPage, 'id' | 'published' | 'title' | 'content'>>;

type ServerSideProps = {
	story: PublicStory,
	results: StorySearchResults
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ story, results }) => {
	const router = useRouter();

	const searchQuery = (
		typeof router.query.query === 'string'
			? router.query.query
			: ''
	).toLowerCase();

	const previewMode = 'preview' in router.query;

	let matches = 0;

	const resultNodes = results.map(result => {
		const getNodes = (string: string) => {
			/**
			 * The array of nodes for the marked string.
			 *
			 * In order to ensure unique keys, each node's key must be the index of the node's content in the original string, and no node can be empty.
			 */
			const nodes: ReactNode[] = [];

			// TODO: Accommodate the fact that `toLowerCase` can change a string's length, causing indexes in `stringToSearch` not to match up with indexes in `string`.
			const stringToSearch = string.toLowerCase();
			let index = stringToSearch.indexOf(searchQuery);

			// Ensure this slice won't be empty due to the start of the string equaling the start of the next match.
			if (index !== 0) {
				nodes.push(
					<Fragment key={0}>
						{(index === -1
							? string
							: string.slice(0, index)
						)}
					</Fragment>
				);
			}

			while (index !== -1) {
				const endIndex = index + searchQuery.length;

				nodes.push(
					<mark key={index}>
						{string.slice(index, endIndex)}
					</mark>
				);
				matches++;

				index = stringToSearch.indexOf(searchQuery, endIndex);

				// Ensure this slice won't be empty due to the end of this match equaling the start of the next match.
				if (endIndex !== index) {
					nodes.push(
						<Fragment key={endIndex}>
							{(index === -1
								? string.slice(endIndex)
								: string.slice(endIndex, index)
							)}
						</Fragment>
					);
				}
			}

			return nodes;
		};

		return (
			<div
				key={result.id}
				className="story-search-result"
			>
				<div className="story-search-result-heading">
					<div className="story-search-result-timestamp-container">
						{result.published === undefined ? (
							'Draft'
						) : (
							<Timestamp short relative>
								{result.published}
							</Timestamp>
						)}
					</div>
					<StoryPageLink
						className="story-search-result-title"
						pageID={result.id}
					>
						{getNodes(result.title)}
					</StoryPageLink>
				</div>
				<div className="story-search-result-content">
					{getNodes(result.content)}
				</div>
			</div>
		);
	});

	const pageComponent = (
		<Page withFlashyTitle heading="Adventure Search">
			<Section
				id="story-search-section"
				heading={story.title}
			>
				<Formik
					initialValues={{ searchQuery }}
					onSubmit={
						useFunction((values: { searchQuery: string }) => {
							const url = new URL(location.href);
							url.searchParams.set('query', values.searchQuery);
							router.replace(url);
						})
					}
				>
					<Form id="story-search-form">
						<Label className="spaced" htmlFor="field-search-query">
							Search
						</Label>
						<Field
							id="field-search-query"
							name="searchQuery"
							className="spaced"
							autoFocus
							autoComplete="off"
						/>
						<Button
							type="submit"
							icon
							className="search-button spaced"
						/>
					</Form>
				</Formik>
				<div id="story-search-info">
					{`${matches} result${matches === 1 ? '' : 's'} in ${results.length} page${results.length === 1 ? '' : 's'}`}
				</div>
				<div id="story-search-results">
					{resultNodes}
				</div>
			</Section>
		</Page>
	);

	return (
		<StoryIDContext.Provider value={story.id}>
			<PreviewModeContext.Provider value={previewMode}>
				{pageComponent}
			</PreviewModeContext.Provider>
		</StoryIDContext.Provider>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params, query }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	if (!story) {
		return { props: { statusCode: 404 } };
	}

	const previewMode = 'preview' in query;

	if ((
		previewMode
		|| story.privacy === StoryPrivacy.Private
	) && !(
		req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	const searchQuery = (
		typeof query.query === 'string'
			? query.query.toLowerCase()
			: ''
	);

	const results: StorySearchResults = [];

	if (searchQuery) {
		const lastPageID = (
			previewMode
				? Object.values(story.pages).length
				: story.pageCount
		);

		for (let pageID = 1; pageID <= lastPageID; pageID++) {
			const page = story.pages[pageID];

			if (!page.unlisted) {
				const content = parseBBCode(page.content, { removeBBTags: true });
				const title = parseBBCode(page.title, { removeBBTags: true });

				if (
					content.toLowerCase().includes(searchQuery)
					|| title.toLowerCase().includes(searchQuery)
				) {
					results.push({
						id: page.id,
						...page.published !== undefined && {
							published: +page.published
						},
						title,
						content
					});
				}
			}
		}
	}

	return {
		props: {
			story: getPublicStory(story),
			results
		}
	};
});