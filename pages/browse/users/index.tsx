import Page from 'components/Page';
import { withStatusCode } from 'lib/server/errors';
import type { PublicUser } from 'lib/client/users';
import { getPublicUser } from 'lib/server/users';
import { connection } from 'lib/server/db';
import Section from 'components/Section';
import Label from 'components/Label';
import { Field, Form, Formik } from 'formik';
import useFunction from 'lib/client/reactHooks/useFunction';
import Button from 'components/Button';
import Row from 'components/Row';
import Router, { useRouter } from 'next/router';
import findUsersByNameOrID from 'lib/server/findUsersByNameOrID';
import type { integer } from 'lib/types';
import List from 'components/List';
import UserListing from 'components/UserListing';

const MAX_RESULTS_PER_PAGE = 50;

type ServerSideProps = {
	users?: never,
	resultCount?: never
} | {
	users: PublicUser[],
	resultCount: integer
};

const Component = ({ users, resultCount }: ServerSideProps) => {
	const router = useRouter();

	const initialValues = {
		nameOrID: (
			typeof router.query.nameOrID === 'string'
				? router.query.nameOrID
				: ''
		)
	};

	type Values = typeof initialValues;

	return (
		<Page withFlashyTitle heading="Browse Users">
			<Section heading="Search Query">
				<Formik
					initialValues={initialValues}
					onSubmit={
						useFunction((values: Values) => {
							const url = new URL(location.href);

							for (const name of Object.keys(values) as Array<keyof Values>) {
								url.searchParams.set(name, values[name]);
							}

							Router.push(url);
						})
					}
				>
					<Form>
						<Row>
							<Label className="spaced" htmlFor="field-name-or-id">
								Username or ID
							</Label>
							<Field
								id="field-name-or-id"
								name="nameOrID"
								className="spaced"
								required
								maxLength={32}
								autoFocus
							/>
						</Row>
						<Row>
							<Button type="submit">
								Search!
							</Button>
						</Row>
					</Form>
				</Formik>
			</Section>
			{users && (
				<Section
					heading={`Search Results (${users.length} of ${resultCount})`}
				>
					<List listing={UserListing}>
						{users}
					</List>
				</Section>
			)}
		</Page>
	);
};

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ query }) => {
	await connection;

	let pageNumber = typeof query.p === 'string' ? +query.p : 1;

	if (Number.isNaN(pageNumber) || pageNumber < 1) {
		pageNumber = 1;
	}

	const startIndex = (pageNumber - 1) * MAX_RESULTS_PER_PAGE;

	const results = (
		typeof query.nameOrID === 'string'
			? (await findUsersByNameOrID(query.nameOrID)).map(getPublicUser)
			: undefined
	);

	return {
		props: results ? {
			users: results.slice(startIndex, startIndex + MAX_RESULTS_PER_PAGE),
			resultCount: results.length
		} : {}
	};
});