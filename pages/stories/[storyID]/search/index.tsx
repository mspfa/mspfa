import './styles.module.scss';
import { withErrorPage } from 'lib/client/errors';
import { Perm } from 'lib/client/perms';
import type { ClientStoryPage, PublicStory } from 'lib/client/stories';
import StoryPrivacy from 'lib/client/StoryPrivacy';
import withStatusCode from 'lib/server/withStatusCode';
import { getPublicStory } from 'lib/server/stories';
import getStoryByUnsafeID from 'lib/server/stories/getStoryByUnsafeID';
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
import PreviewModeContext from 'lib/client/reactContexts/PreviewModeContext';
import StoryIDContext from 'lib/client/reactContexts/StoryIDContext';
import { escapeRegExp } from 'lodash';
import Row from 'components/Row';

type StorySearchResult = Pick<ClientStoryPage, 'id' | 'published' | 'title' | 'content'>;

type ServerSideProps = {
	story: PublicStory,
	results: StorySearchResult[]
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ story, results }) => {
	const router = useRouter();

	const searchQuery = (
		typeof router.query.query === 'string'
			? router.query.query
			: ''
	);
	const escapedQuery = escapeRegExp(searchQuery);

	const previewMode = 'preview' in router.query;

	let matches = 0;

	const markResults = (string: string) => {
		const queryTest = new RegExp(escapedQuery, 'gi');

		/**
		 * The array of nodes for the marked string.
		 *
		 * In order to ensure unique keys, each node's key must be the index of the node's content in the original string, and no node can be empty.
		 */
		const nodes: ReactNode[] = [];

		let match = queryTest.exec(string);

		// Ensure this slice won't be empty due to the start of the string equaling the start of the next match, which could result in duplicate React keys.
		if (match?.index !== 0) {
			nodes.push(
				<Fragment key={0}>
					{(match
						? string.slice(0, match.index)
						: string
					)}
				</Fragment>
			);
		}

		while (match) {
			const endIndex = match.index + match[0].length;

			nodes.push(
				<mark key={match.index}>
					{string.slice(match.index, endIndex)}
				</mark>
			);
			matches++;

			match = queryTest.exec(string);

			// Ensure this slice won't be empty due to the end of this match equaling the start of the next match, which could result in duplicate React keys.
			if (endIndex !== match?.index) {
				nodes.push(
					<Fragment key={endIndex}>
						{(match
							? string.slice(endIndex, match.index)
							: string.slice(endIndex)
						)}
					</Fragment>
				);
			}
		}

		return nodes;
	};

	// All `markResults` calls must occur before computing `pageComponent` so that the value of `matches` is correct before being passed into `pageComponent`.
	const resultNodes = results.map(result => (
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
				<div className="story-search-result-title-container">
					<span className="story-search-result-id">
						{result.id}
					</span>
					<StoryPageLink
						className="story-search-result-title"
						pageID={result.id}
					>
						{markResults(result.title)}
					</StoryPageLink>
				</div>
			</div>
			<div className="story-search-result-content">
				{markResults(result.content)}
			</div>
		</div>
	));

	const pageComponent = (
		<Page withFlashyTitle heading="Adventure Search">
			<Section
				id="story-search-section"
				heading={story.title}
			>
				<Row id="story-search-actions">
					<Button
						className="small"
						href={`/?s=${story.id}`}
					>
						Back to Adventure
					</Button>
				</Row>
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
			? query.query
			: ''
	);

	const results: StorySearchResult[] = [];

	if (searchQuery) {
		const queryTest = new RegExp(escapeRegExp(searchQuery), 'i');

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

				if (queryTest.test(content) || queryTest.test(title)) {
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