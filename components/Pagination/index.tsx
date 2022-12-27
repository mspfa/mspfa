import './styles.module.scss';
import type { integer } from 'lib/types';
import Router, { useRouter } from 'next/router';
import Row from 'components/Row';
import Link from 'components/Link';
import type { ReactNode } from 'react';
import React from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'components/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import Action from 'components/Dialog/Action';

export type PaginationProps = {
	maxPage: integer
};

/** A set of page numbers which link to different `p` values of the URL's query. */
const Pagination = React.memo(({ maxPage }: PaginationProps) => {
	const router = useRouter();

	let currentPage = (
		typeof router.query.p === 'string'
			? +router.query.p
			: 1
	);

	if (Number.isNaN(currentPage) || currentPage < 1) {
		currentPage = 1;
	}

	// It doesn't matter what base parameter is set for the URL here. It's unused.
	const url = new URL(router.asPath, 'https://mspfa.com');

	/** Returns a `Link` to the specified page number. */
	const getPageLink = (pageNumber: integer, children?: ReactNode) => {
		url.searchParams.set('p', pageNumber.toString());

		return (
			<Link
				className="spaced"
				href={url.pathname + url.search}
			>
				{children ?? pageNumber}
			</Link>
		);
	};

	const pageEllipsis = (
		<Link
			className="spaced"
			onClick={
				useFunction(async () => {
					const initialValues = { pageNumber: '' };

					type Values = typeof initialValues;
					const dialog = await Dialog.create<Values>(
						<Dialog
							id="pagination"
							title="Go to Page"
							initialValues={initialValues}
						>
							<LabeledGrid>
								<LabeledGridField
									type="number"
									name="pageNumber"
									label="Page Number"
									min={1}
									max={maxPage}
									required
									autoFocus
								/>
							</LabeledGrid>
							{Action.OKAY}
							{Action.CANCEL}
						</Dialog>
					);

					if (dialog.canceled) {
						return;
					}

					url.searchParams.set('p', dialog.values.pageNumber);
					Router.push(url.pathname + url.search);
				})
			}
		>
			…
		</Link>
	);

	return (
		<Row className="pagination">
			{currentPage === 1 ? (
				<span className="spaced translucent">
					{'< Back'}
				</span>
			) : (
				<>
					{getPageLink(currentPage - 1, '< Back')}
					{getPageLink(1)}
					{currentPage - 3 > 1 && (
						pageEllipsis
					)}
					{currentPage - 2 > 1 && (
						getPageLink(currentPage - 2)
					)}
					{currentPage - 1 > 1 && (
						getPageLink(currentPage - 1)
					)}
				</>
			)}
			<span className="spaced">
				{currentPage}
			</span>
			{currentPage < maxPage ? (
				<>
					{currentPage + 1 < maxPage && (
						getPageLink(currentPage + 1)
					)}
					{currentPage + 2 < maxPage && (
						getPageLink(currentPage + 2)
					)}
					{currentPage + 3 < maxPage && (
						pageEllipsis
					)}
					{getPageLink(maxPage)}
					{getPageLink(currentPage + 1, 'Next >')}
				</>
			) : (
				<span className="spaced translucent">
					{'Next >'}
				</span>
			)}
		</Row>
	);
});

export default Pagination;
