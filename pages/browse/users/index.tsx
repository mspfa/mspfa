import withStatusCode from 'lib/server/withStatusCode';
import type { PublicUser } from 'lib/client/users';
import { getPublicUser } from 'lib/server/users';
import { connection } from 'lib/server/db';
import Label from 'components/Label';
import { Field } from 'formik';
import Row from 'components/Row';
import { useRouter } from 'next/router';
import getUsersByNameOrID from 'lib/server/users/getUsersByNameOrID';
import type { integer } from 'lib/types';
import UserListing from 'components/UserListing';
import BrowsePage from 'components/BrowsePage';

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

	return (
		<BrowsePage
			resourceLabel="Users"
			initialValues={{
				nameOrID: (
					typeof router.query.nameOrID === 'string'
						? router.query.nameOrID
						: ''
				)
			}}
			listing={UserListing}
			resultCount={resultCount}
			results={users}
		>
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
					// Only auto-focus if there isn't already a search query.
					autoFocus={!users}
				/>
			</Row>
		</BrowsePage>
	);
};

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ query }) => {
	await connection;

	const results = (
		typeof query.nameOrID === 'string'
			? (await getUsersByNameOrID(query.nameOrID)).map(getPublicUser)
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
			users: results.slice(startIndex, startIndex + MAX_RESULTS_PER_PAGE),
			resultCount: results.length
		};
	} else {
		props = {};
	}

	return { props };
});