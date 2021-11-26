import Button from 'components/Button';
import type { ListingPropsBase, ListProps } from 'components/List';
import List from 'components/List';
import Page from 'components/Page';
import Pagination from 'components/Pagination';
import Row from 'components/Row';
import Section from 'components/Section';
import type { FormikValues } from 'formik';
import { Form, Formik } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { integer } from 'lib/types';
import Router from 'next/router';
import type { ReactNode } from 'react';

export const MAX_RESULTS_PER_PAGE = 50;

/** What every `Listing`'s props must extend if it is to be passed into a `BrowsePage`. */
type BrowsePageListingPropsBase = ListingPropsBase & {
	resourceLabel?: never,
	initialValues?: never,
	results?: never,
	resultCount?: never
};

export type BrowsePageProps<
	Values extends FormikValues,
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
	children: ReactNode
} & Omit<ListProps<ListingProps, keyof BrowsePageListingPropsBase>, 'children'>;

/**
 * A `Page` for browsing a resource via a search query and search results based on the URL's query params.
 *
 * There must be a `p` query param representing the page number of the results to display.
 */
const BrowsePage = <
	Values extends FormikValues,
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
								url.searchParams.set(name, values[name]);
							}

							url.searchParams.set('p', '1');

							Router.push(url, undefined, { scroll: false });
						})
					}
					enableReinitialize
				>
					<Form>
						{children}
						<Row>
							<Button type="submit">
								Search!
							</Button>
						</Row>
					</Form>
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