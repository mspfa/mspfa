import './styles.module.scss';
import { withStatusCode } from 'lib/server/errors';
import type { PublicStory } from 'lib/client/stories';
import { connection } from 'lib/server/db';
import Label from 'components/Label';
import { Field } from 'formik';
import Row from 'components/Row';
import { useRouter } from 'next/router';
import type { integer } from 'lib/types';
import BrowsePage, { getBooleanRecordFromQueryValue, getStringFromQueryValue, getTagsFromQueryValue, MAX_RESULTS_PER_PAGE } from 'components/BrowsePage';
import StoryListing from 'components/StoryListing';
import TagField from 'components/TagField';
import type StoryStatus from 'lib/client/StoryStatus';
import { storyStatusNames } from 'lib/client/StoryStatus';
import type { ChangeEvent, ReactNode } from 'react';
import { useState } from 'react';
import type { StorySortMode } from 'pages/api/stories';
import useFunction from 'lib/client/reactHooks/useFunction';

/** A record which maps every `StoryStatus` to `true`. */
const allStatusesTrue: Record<string, true> = {} as any;

const statusFieldContainers: ReactNode[] = [];

for (const status of Object.keys(storyStatusNames)) {
	allStatusesTrue[status] = true;

	statusFieldContainers.push(
		<span
			key={status}
			className="browse-stories-checkbox-field-container"
		>
			<Field
				type="checkbox"
				id={`field-status-${status}`}
				name={`status.${status}`}
				className="spaced"
			/>
			<label
				className="spaced"
				htmlFor={`field-status-${status}`}
			>
				{storyStatusNames[status as unknown as StoryStatus]}
			</label>
		</span>
	);
}

/** A mapping from each `StorySortMode` to the `StorySortMode` which is in reverse from it. */
const reversedSorts: Record<StorySortMode, StorySortMode> = {
	titleIndex: 'titleIndex',
	mostFavs: 'fewestFavs',
	fewestFavs: 'mostFavs',
	mostPages: 'fewestPages',
	fewestPages: 'mostPages',
	newest: 'oldest',
	oldest: 'newest',
	newestUpdated: 'newestUpdated',
	random: 'random'
};

type ServerSideProps = {
	stories?: never,
	resultCount?: never
} | {
	stories: PublicStory[],
	resultCount: integer
};

const Component = ({ stories, resultCount }: ServerSideProps) => {
	const router = useRouter();

	const [sortReverse, setSortReverse] = useState(false);

	return (
		<BrowsePage
			resourceLabel="Adventures"
			initialValues={{
				title: getStringFromQueryValue(router.query.title),
				tags: getTagsFromQueryValue(router.query.tags, ['-test']),
				status: getBooleanRecordFromQueryValue(router.query.status, allStatusesTrue),
				sort: getStringFromQueryValue(router.query.sort, 'mostFavs') as StorySortMode
			}}
			listing={StoryListing}
			resultCount={resultCount}
			results={stories}
		>
			{function BrowsePageContent({ values, setFieldValue }) {
				/** The reverse of the `sort` value. */
				const reversedSort = reversedSorts[values.sort];
				/** Whether the `sort` value should remain the same when `sortReverse`. */
				const symmetricalSort = values.sort === reversedSort;

				return (
					<>
						<Row>
							<Label className="spaced" htmlFor="field-title">
								Title
							</Label>
							<Field
								id="field-title"
								name="title"
								className="spaced"
								maxLength={50}
								autoFocus
							/>
						</Row>
						<Row>
							<Label className="spaced">
								Status
							</Label>
							{statusFieldContainers}
						</Row>
						<Row>
							<TagField allowExcludedTags />
						</Row>
						<Row>
							<Label className="spaced" htmlFor="field-sort">
								Sort By
							</Label>
							<Field
								as="select"
								id="field-sort"
								name="sort"
								className="spaced"
							>
								<option value="titleIndex">Title Relevance</option>
								{sortReverse ? (
									<>
										<option value="fewestFavs">Fewest Favorites</option>
										<option value="fewestPages">Fewest Pages</option>
										<option value="oldest">Oldest</option>
									</>
								) : (
									<>
										<option value="mostFavs">Most Favorites</option>
										<option value="mostPages">Most Pages</option>
										<option value="newest">Most Recently Created</option>
									</>
								)}
								<option value="newestUpdated">Most Recently Updated</option>
								<option value="random">Random</option>
							</Field>
							<span
								// Make the reverse checkbox translucent when `symmetricalSort` to make it clear to the user that reversing is unused for this sort method, but don't disable it or else that would make it less convenient to access a couple sorting options from the `sort` field.
								className={`browse-stories-checkbox-field-container${symmetricalSort ? ' translucent' : ''}`}
							>
								<input
									type="checkbox"
									id="field-sort-reverse"
									className="spaced"
									checked={sortReverse}
									onChange={
										useFunction((event: ChangeEvent<HTMLInputElement>) => {
											setSortReverse(event.target.checked);

											if (!symmetricalSort) {
												setFieldValue('sort', reversedSort);
											}
										})
									}
								/>
								<label
									htmlFor="field-sort-reverse"
									className="spaced"
								>
									Reverse
								</label>
							</span>
						</Row>
					</>
				);
			}}
		</BrowsePage>
	);
};

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ query }) => {
	await connection;

	const results = ( // TODO
		typeof query.title === 'string'
			? []
			: undefined
	);

	let props;

	if (results) {
		let pageNumber = typeof query.p === 'string' ? +query.p : 1;

		if (Number.isNaN(pageNumber) || pageNumber < 1) {
			pageNumber = 1;
		}

		const startIndex = (pageNumber - 1) * MAX_RESULTS_PER_PAGE;

		props = {
			stories: results.slice(startIndex, startIndex + MAX_RESULTS_PER_PAGE),
			resultCount: results.length
		};
	} else {
		props = {};
	}

	return { props };
});