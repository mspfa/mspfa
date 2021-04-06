import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PrivateUser } from 'modules/client/users';
import { getPrivateUser } from 'modules/server/users'; // @server-only
import ErrorPage from 'pages/_error';

type ServerSideProps = {
	user?: PrivateUser
};

const Component = ({ user }: ServerSideProps) => (
	user ? (
		<Page>
			{user.id}
		</Page>
	) : <ErrorPage statusCode={403} />
);

export default Component;

export const getServerSideProps: MyGetServerSideProps = async context => {
	const props: ServerSideProps = {};
	
	if (context.req.user) {
		getPrivateUser(context.req.user);
	}
	
	return { props };
};