import './styles.module.scss';
import type { integer } from 'lib/types';
import Router, { useRouter } from 'next/router';
import Row from 'components/Row';
import Link from 'components/Link';
import type { ReactNode } from 'react';
import React from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'lib/client/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';

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
	const pageLink = (pageNumber: integer, children?: ReactNode) => {
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
					const dialog = new Dialog({
						id: 'pagination',
						title: 'Go to Page',
						initialValues: { pageNumber: '' },
						content: (
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
						),
						actions: [
							{ label: 'Okay', autoFocus: false },
							'Cancel'
						]
					});

					if (!(await dialog)?.submit) {
						return;
					}

					url.searchParams.set('p', dialog.form!.values.pageNumber);
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
					{pageLink(currentPage - 1, '< Back')}
					{pageLink(1)}
					{currentPage - 3 > 1 && (
						pageEllipsis
					)}
					{currentPage - 2 > 1 && (
						pageLink(currentPage - 2)
					)}
					{currentPage - 1 > 1 && (
						pageLink(currentPage - 1)
					)}
				</>
			)}
			<span className="spaced">
				{currentPage}
			</span>
			{currentPage < maxPage ? (
				<>
					{currentPage + 1 < maxPage && (
						pageLink(currentPage + 1)
					)}
					{currentPage + 2 < maxPage && (
						pageLink(currentPage + 2)
					)}
					{currentPage + 3 < maxPage && (
						pageEllipsis
					)}
					{pageLink(maxPage)}
					{pageLink(currentPage + 1, 'Next >')}
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