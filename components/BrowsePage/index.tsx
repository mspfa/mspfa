import './styles.module.scss';
import Button from 'components/Button';
import type { ListingPropsBase, ListProps } from 'components/List';
import List from 'components/List';
import Page from 'components/Page';
import Pagination from 'components/Pagination';
import Row from 'components/Row';
import Section from 'components/Section';
import type { FormikConfig } from 'formik';
import { Form, Formik } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import { tagOrExcludedTagTest } from 'lib/client/storyTags';
import type { integer } from 'lib/types';
import Router from 'next/router';

export const MAX_RESULTS_PER_PAGE = 50;

type ValuesBase = Record<string, (
	boolean | number | string
	| Array<boolean | number | string>
	| Record<string, boolean>
)>;

export const serializeSearchQueryValue = (value: ValuesBase[keyof ValuesBase]): string => (
	typeof value === 'string'
		? value
		: typeof value === 'boolean'
			? value
				? '1'
				: ''
			: typeof value === 'number'
				? value.toString()
				: Array.isArray(value)
					? value.map(serializeSearchQueryValue).join(',')
					: Object.keys(value).filter(valueKey => value[valueKey]).join(',')
);

/** Accepts a query value which may have been serialized from a `boolean` by `serializeSearchQueryValue`. Returns the original `boolean`. */
// This must not accept a default value, or else `false` would not be omittable in query serialization and would have to be serialized to `0`.
export const getBooleanFromQueryValue = (queryValue: undefined | string | string[]) => (
	queryValue === '1'
);

/** Accepts a query value which may have been serialized from a `number` by `serializeSearchQueryValue`. Returns the original `number`. */
export const getNumberFromQueryValue = (
	queryValue: undefined | string | string[],
	min = -Infinity,
	max = Infinity,
	defaultValue: '' | number = ''
) => {
	if (typeof queryValue !== 'string') {
		return defaultValue;
	}

	const value = +queryValue;
	return (
		Number.isNaN(value)
			? defaultValue
			: Math.max(min, Math.min(max, value))
	);
};

/** Accepts a query value which may have been serialized from a `string` by `serializeSearchQueryValue`. Returns the original `string`. */
export const getStringFromQueryValue = (
	queryValue: undefined | string | string[],
	defaultValue = ''
) => (
	typeof queryValue === 'string'
		? queryValue
		: defaultValue
);

/** Accepts a query value which may have been serialized from a `Record<string, boolean>` by `serializeSearchQueryValue`. Returns the original `Record`. */
export const getBooleanRecordFromQueryValue = (
	queryValue: undefined | string | string[],
	defaultValue: Record<string, boolean> = {}
) => {
	if (typeof queryValue !== 'string') {
		return defaultValue;
	}

	const value: Record<string, boolean> = {};

	if (queryValue) {
		for (const key of queryValue.split(',')) {
			// Ensure `key` isn't some dangerous internal value of the object.
			if (!(key in value)) {
				value[key] = true;
			}
		}
	}

	return value;
};

/** Accepts a query value which represents a set of tags and excluded tags. Returns an array of only the valid and unique tags and excluded tags. */
export const getTagsFromQueryValue = (
	queryValue: undefined | string | string[],
	defaultValue: string[] = []
) => (
	typeof queryValue === 'string'
		? queryValue
			? queryValue.split(',').filter((tagValue, i, tagValues) => (
				// Only allow valid tag or excluded tag values.
				tagOrExcludedTagTest.test(tagValue)
				// Disallow duplicate values.
				&& tagValues.indexOf(tagValue) === i
			))
			: []
		: defaultValue
);

/** What every `Listing`'s props must extend if it is to be passed into a `BrowsePage`. */
type BrowsePageListingPropsBase = ListingPropsBase & {
	resourceLabel?: never,
	initialValues?: never,
	results?: never,
	resultCount?: never
};

export type BrowsePageProps<
	Values extends ValuesBase,
	ListingProps extends BrowsePageListingPropsBase
> = {
	/** The name of the resource being browsed, for example `'Adventures'`. */
	resourceLabel: string,
	initialValues: Values,
	/** The total number of search results (which may be greater than `results.length` if not all `results` fit on the page), or undefined if no search query has been submitted yet. */
	resultCount?: integer,
	/** An array of the resources on the current page of search results, or undefined if no search query has been submitted yet. */
	results?: ListProps<ListingProps>['children'],
	/** The fields of the search query form. */
	children: FormikConfig<Values>['children']
} & Omit<ListProps<ListingProps, keyof BrowsePageListingPropsBase>, 'children'>;

/**
 * A `Page` for browsing a resource via a search query and search results based on the URL's query params.
 *
 * There must be a `p` query param representing the page number of the results to display.
 */
const BrowsePage = <
	Values extends ValuesBase,
	ListingProps extends BrowsePageListingPropsBase
>({
	resourceLabel,
	initialValues,
	listing: Listing,
	resultCount,
	results,
	children,
	...props
}: BrowsePageProps<Values, ListingProps>) => {
	const maxPageNumber = (
		resultCount === undefined
			? undefined
			: Math.ceil(resultCount / MAX_RESULTS_PER_PAGE)
	);

	return (
		<Page
			withFlashyTitle
			heading={`Browse ${resourceLabel}`}
		>
			<Section heading="Search Query">
				<Formik
					initialValues={initialValues}
					onSubmit={
						useFunction((values: Values) => {
							const url = new URL(location.href);

							for (const name of Object.keys(values)) {
								const serializedValue = serializeSearchQueryValue(values[name]);
								if (serializedValue) {
									url.searchParams.set(name, serializedValue);
								}
							}

							url.searchParams.set('p', '1');

							Router.push(url, undefined, { scroll: false });
						})
					}
					enableReinitialize
				>
					{formikProps => (
						<Form>
							{typeof children === 'function' ? children(formikProps) : children}
							<Row>
								<Button type="submit">
									Search!
								</Button>
							</Row>
						</Form>
					)}
				</Formik>
			</Section>
			{results && (
				resultCount ? (
					<Section
						heading={
							`Search Results (${
								results.length === resultCount
									? resultCount
									: `${results.length} of ${resultCount}`
							})`
						}
					>
						<Pagination maxPage={maxPageNumber!} />
						<List<ListingProps, keyof BrowsePageListingPropsBase>
							listing={Listing}
							// Remove the `as any` if you dare. I cannot figure out a fix for this TS error.
							{...props as any}
						>
							{results}
						</List>
						<Pagination maxPage={maxPageNumber!} />
					</Section>
				) : (
					<Section heading="Search Results">
						No results.
					</Section>
				)
			)}
		</Page>
	);
};

export default BrowsePage;