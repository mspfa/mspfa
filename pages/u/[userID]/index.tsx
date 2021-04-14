import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PublicUser } from 'modules/client/users';
import { getUserByUnsafeID, getPublicUser } from 'modules/server/users';
import { withErrorPage } from 'pages/_error';

type ServerSideProps = {
	publicUser: PublicUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicUser }) => (
	<Page flashyTitle>
		{publicUser.id}
	</Page>
));

export default Component;

export const getServerSideProps: MyGetServerSideProps<ServerSideProps> = async ({ params }) => {
	const userFromParams = await getUserByUnsafeID(params.userID);

	if (userFromParams) {
		return {
			props: {
				publicUser: getPublicUser(userFromParams)
			}
		};
	}

	return { props: { statusCode: 404 } };
};