import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PublicUser } from 'modules/client/users';
import { getUserByUnsafeID, getPublicUser } from 'modules/server/users';
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

export const getServerSideProps: MyGetServerSideProps<ServerSideProps> = async context => {
	const props: ServerSideProps = {};
	
	const userFromParams = await getUserByUnsafeID(context.params.userID);
	
	if (userFromParams) {
		props.publicUser = getPublicUser(userFromParams);
	}
	
	return { props };
};