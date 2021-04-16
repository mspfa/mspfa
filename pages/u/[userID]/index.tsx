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
import Link from 'components/Link';

type ServerSideProps = {
	publicUser: PublicUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicUser }) => (
	<Page flashyTitle heading="Profile">
		<Grid>
			<ColumnGrid id="profile-column-grid">
				<Grid className="grid-with-single-section">
					<GridSection heading="Meta">
						{publicUser.name}
					</GridSection>
				</Grid>
				<Grid>
					<GridRowSection heading="Stats">
						<GridRow label="Last Connection">
							<Timestamp relative withTime>{publicUser.lastSeen}</Timestamp>
						</GridRow>
						<GridRow label="Joined MSPFA">
							<Timestamp>{publicUser.created}</Timestamp>
						</GridRow>
						{publicUser.birthdate && (
							<GridRow label="Birthdate">
								<Timestamp>{publicUser.birthdate}</Timestamp>
							</GridRow>
						)}
					</GridRowSection>
					{(publicUser.email || publicUser.site) && (
						<GridRowSection heading="Contact">
							{publicUser.email && (
								<GridRow label="Email">
									<Link
										href={`mailto:${publicUser.email}`}
										target="_blank"
									>
										{publicUser.email}
									</Link>
								</GridRow>
							)}
							{publicUser.site && (
								<GridRow label="Website">
									<Link
										href={publicUser.site}
										target="_blank"
									>
										{publicUser.site}
									</Link>
								</GridRow>
							)}
						</GridRowSection>
					)}
				</Grid>
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