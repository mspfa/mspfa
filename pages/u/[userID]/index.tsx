import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PublicUser } from 'modules/client/users';
import { getUserByUnsafeID, getPublicUser } from 'modules/server/users'; // @server-only
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
	
	const user = await getUserByUnsafeID(context.params!.userID as string);
	
	if (user) {
		props.publicUser = getPublicUser(user);
	}
	
	return { props };
};