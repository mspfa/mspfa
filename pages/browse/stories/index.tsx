import withStatusCode from 'lib/server/withStatusCode';
import type { PublicStory } from 'lib/client/stories';
import { connection } from 'lib/server/db';
import Label from 'components/Label';
import { Field } from 'formik';
import Row from 'components/Row';
import { useRouter } from 'next/router';
import type { integer } from 'lib/types';
import BrowsePage, { getBooleanFromQueryValue, getBooleanRecordFromQueryValue, getNumberFromQueryValue, getStringFromQueryValue, getTagsFromQueryValue, MAX_RESULTS_PER_PAGE } from 'components/BrowsePage';
import StoryListing from 'components/StoryListing';
import TagField from 'components/TagField';
import type StoryStatus from 'lib/client/StoryStatus';
import { storyStatusNames } from 'lib/client/StoryStatus';
import type { ChangeEvent, ReactNode } from 'react';
import { useState } from 'react';
import type { StorySortMode } from 'pages/api/stories';
import useFunction from 'lib/client/reactHooks/useFunction';
import BrowsePageAdvancedOptions from 'components/BrowsePage/BrowsePageAdvancedOptions';
import BrowsePageRangeField from 'components/BrowsePage/BrowsePageRangeField';
import BrowsePageDateRangeField, { DEFAULT_MIN_DATE } from 'components/BrowsePage/BrowsePageDateRangeField';

/** A record which maps every `StoryStatus` to `true`. */
const allStatusesTrue: Record<string, true> = {};

const statusFieldContainers: ReactNode[] = [];

for (const status of Object.keys(storyStatusNames)) {
	allStatusesTrue[status] = true;

	statusFieldContainers.push(
		<span
			key={status}
			className="browse-page-checkbox-field-container"
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

/** A mapping from each `StorySortMode` to the `StorySortMode` which sorts in reverse from it. */
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

const DEFAULT_SORT = 'mostFavs';

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

	const now = Date.now();

	const minCreatedRelative = getBooleanFromQueryValue(router.query.minCreatedRelative);
	const maxCreatedRelative = getBooleanFromQueryValue(router.query.maxCreatedRelative);
	const minUpdatedRelative = getBooleanFromQueryValue(router.query.minUpdatedRelative);
	const maxUpdatedRelative = getBooleanFromQueryValue(router.query.maxUpdatedRelative);

	return (
		<BrowsePage
			resourceLabel="Adventures"
			initialValues={{
				title: getStringFromQueryValue(router.query.title),
				tags: getTagsFromQueryValue(router.query.tags, ['-test']),
				status: getBooleanRecordFromQueryValue(router.query.status, allStatusesTrue),
				sort: getStringFromQueryValue(router.query.sort, DEFAULT_SORT) as StorySortMode,
				minFavCount: getNumberFromQueryValue(router.query.minFavCount, 0),
				maxFavCount: getNumberFromQueryValue(router.query.maxFavCount, 0),
				minPageCount: getNumberFromQueryValue(router.query.minPageCount, 0),
				maxPageCount: getNumberFromQueryValue(router.query.maxPageCount, 0),
				minCreated: getNumberFromQueryValue(
					router.query.minCreated,
					minCreatedRelative ? undefined : DEFAULT_MIN_DATE,
					minCreatedRelative ? undefined : now
				),
				minCreatedRelative,
				maxCreated: getNumberFromQueryValue(
					router.query.maxCreated,
					maxCreatedRelative ? undefined : DEFAULT_MIN_DATE,
					maxCreatedRelative ? undefined : now
				),
				maxCreatedRelative,
				minUpdated: getNumberFromQueryValue(
					router.query.minUpdated,
					minUpdatedRelative ? undefined : DEFAULT_MIN_DATE,
					minUpdatedRelative ? undefined : now
				),
				minUpdatedRelative,
				maxUpdated: getNumberFromQueryValue(
					router.query.maxUpdated,
					maxUpdatedRelative ? undefined : DEFAULT_MIN_DATE,
					maxUpdatedRelative ? undefined : now
				),
				maxUpdatedRelative
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

				// Reset the sort method to default if an invalid sort method is selected.
				if (
					// You shouldn't be able to sort by title index if you haven't entered any title.
					values.sort === 'titleIndex' && values.title.length === 0
				) {
					setFieldValue(
						'sort',
						sortReverse ? reversedSorts[DEFAULT_SORT] : DEFAULT_SORT
					);
				}

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
								// Only auto-focus if there isn't already a search query.
								autoFocus={!stories}
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
								required
							>
								{values.title && (
									<option
										value="titleIndex"
										title="Sorts by how early the title you searched for appears in the adventure's title."
									>
										Title Relevance
									</option>
								)}
								{sortReverse ? (
									<>
										<option value="fewestFavs">Least Favorited</option>
										<option value="fewestPages">Fewest Pages</option>
										<option value="oldest">Oldest</option>
									</>
								) : (
									<>
										<option value="mostFavs">Most Favorited</option>
										<option value="mostPages">Most Pages</option>
										<option value="newest">Newest</option>
									</>
								)}
								<option value="newestUpdated">Most Recently Updated</option>
								<option value="random">Random</option>
							</Field>
							<span
								// Make the reverse checkbox translucent when `symmetricalSort` to make it clear to the user that reversing is unused for this sort method, but don't disable it or else that would make it less convenient to access a couple sorting options from the `sort` field.
								className={`browse-page-checkbox-field-container${symmetricalSort ? ' translucent' : ''}`}
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
						<BrowsePageAdvancedOptions>
							<BrowsePageRangeField nameBase="FavCount" label="Favorite Count" />
							<BrowsePageRangeField nameBase="PageCount" label="Page Count" />
							<BrowsePageDateRangeField nameBase="Created" label="Date Created" />
							<BrowsePageDateRangeField nameBase="Updated" label="Date Updated" />
						</BrowsePageAdvancedOptions>
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