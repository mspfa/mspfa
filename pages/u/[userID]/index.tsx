import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PublicUser } from 'modules/client/users';
import { getUserByUnsafeID, getPublicUser } from 'modules/server/users';
import { withErrorPage } from 'pages/_error';
import Grid from 'components/Grid';
import './styles.module.scss';

type ServerSideProps = {
	publicUser: PublicUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicUser }) => (
	<Page flashyTitle heading="Profile">
		<Grid>
			<
		</Grid>
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