import './styles.module.scss';
import { withErrorPage } from 'lib/client/errors';
import { Perm } from 'lib/client/perms';
import type { ClientStoryPage, PublicStory } from 'lib/client/stories';
import { StoryPrivacy } from 'lib/client/stories';
import { withStatusCode } from 'lib/server/errors';
import { getPublicStory, getStoryByUnsafeID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import Page from 'components/Page';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import { useNavStoryID } from 'components/Nav';
import { Field, Form, Formik } from 'formik';
import { useRouter } from 'next/router';
import useFunction from 'lib/client/useFunction';
import Button from 'components/Button';
import Label from 'components/Label';
import { sanitizeBBCode } from 'components/BBCode';
import Link from 'components/Link';
import Timestamp from 'components/Timestamp';
import type { ReactNode } from 'react';
import { Fragment } from 'react';

type StorySearchResults = Array<Pick<ClientStoryPage, 'id' | 'published' | 'title' | 'content'>>;

type ServerSideProps = {
	publicStory: PublicStory,
	results: StorySearchResults
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ publicStory, results }) => {
	useNavStoryID(publicStory.id);

	const router = useRouter();

	const previewMode = 'preview' in router.query;

	const searchQuery = (
		typeof router.query.query === 'string'
			? router.query.query
			: ''
	).toLowerCase();

	let matches = 0;

	const resultNodes = results.map(result => {
		const getNodes = (string: string) => {
			/**
			 * The array of nodes for the marked string.
			 *
			 * In order to ensure unique keys, each node's key must be the index of the node's content in the original string, and no node can be empty.
			 */
			const nodes: ReactNode[] = [];

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
					<Link
						className="story-search-result-title"
						href={`/?s=${publicStory.id}&p=${result.id}${previewMode ? '&preview=1' : ''}`}
					>
						{getNodes(result.title)}
					</Link>
				</div>
				<div className="story-search-result-content">
					{getNodes(result.content)}
				</div>
			</div>
		);
	});

	return (
		<Page withFlashyTitle heading="Adventure Search">
			<Box>
				<BoxSection
					id="story-search-section"
					heading={publicStory.title}
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
				</BoxSection>
			</Box>
		</Page>
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
			|| (req.user.perms & Perm.sudoRead)
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
				const content = sanitizeBBCode(page.content, { noBB: true });
				const title = sanitizeBBCode(page.title, { noBB: true });

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
			publicStory: getPublicStory(story),
			results
		}
	};
});