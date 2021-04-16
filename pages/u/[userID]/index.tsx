import Page from 'components/Page';
import type { MyGetServerSideProps } from 'modules/server/pages';
import type { PublicUser } from 'modules/client/users';
import { getUserByUnsafeID, getPublicUser } from 'modules/server/users';
import { withErrorPage } from 'pages/_error';
import Grid from 'components/Grid';
import ColumnGrid from 'components/Grid/ColumnGrid';
import GridSection from 'components/Grid/GridSection';
import GridRowSection from 'components/Grid/GridRowSection';
import GridRow from 'components/Grid/GridRow';
import Timestamp from 'components/Timestamp';
import './styles.module.scss';

type ServerSideProps = {
	publicUser: PublicUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicUser }) => (
	<Page flashyTitle heading="Profile">
		<Grid>
			<ColumnGrid id="profile-column-grid">
				<GridSection heading="Presence">
					{publicUser.name}
				</GridSection>
				<GridRowSection heading="Stats">
					<GridRow
						label="Last Connection"
					>
						<Timestamp>{publicUser.lastSeen}</Timestamp>
					</GridRow>
				</GridRowSection>
			</ColumnGrid>
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