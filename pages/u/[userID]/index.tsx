import Page from 'components/Page';
import type { GetServerSideProps } from 'next';
import type { PublicUser } from 'modules/client/users';
import { safeObjectID } from 'modules/server/db'; // @server-only
import users, { getPublicUser } from 'modules/server/users'; // @server-only
import ErrorPage from 'pages/_error';

type ServerSideProps = {
	publicUser?: PublicUser
};

const Component = ({ publicUser }: ServerSideProps) => (
	publicUser ? (
		<Page>
			{publicUser.id}
		</Page>
	) : <ErrorPage />
);

export default Component;

// @server-only {
export const getServerSideProps: GetServerSideProps = async context => {
	const props: ServerSideProps = {};
	
	const userID = safeObjectID(context.params!.userID as string);
	
	if (userID) {
		const user = await users.findOne({
			_id: userID
		});
		if (user) {
			props.publicUser = getPublicUser(user);
		}
	}
	
	return { props };
};
// @server-only }