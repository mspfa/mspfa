import Page from 'components/Page';
import { useUser } from 'modules/client/users';
import type { PublicUser } from 'modules/client/users';
import { getUserByUnsafeID, getPublicUser } from 'modules/server/users';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Grid from 'components/Grid';
import ColumnGrid from 'components/Grid/ColumnGrid';
import GridSection from 'components/Grid/GridSection';
import GridRowSection from 'components/Grid/GridRowSection';
import GridRow from 'components/Grid/GridRow';
import Timestamp from 'components/Timestamp';
import Link from 'components/Link';
import GridFooter from 'components/Grid/GridFooter';
import Button from 'components/Button';
import './styles.module.scss';

type ServerSideProps = {
	publicUser: PublicUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicUser }) => {
	const user = useUser();

	return (
		<Page flashyTitle heading="Profile">
			<Grid id="profile-grid">
				<ColumnGrid id="profile-column-grid">
					<Grid className="grid-with-single-section">
						<GridSection id="section-meta" heading="Meta">
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
				<GridSection id="section-description" heading="Description">
					{publicUser.description}
				</GridSection>
				{user && (
					user.id === publicUser.id
					|| user.perms.sudoRead
				) && (
					<GridFooter>
						<Button>Edit</Button>
					</GridFooter>
				)}
			</Grid>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ params }) => {
	const userFromParams = await getUserByUnsafeID(params.userID);

	if (userFromParams) {
		return {
			props: {
				publicUser: getPublicUser(userFromParams)
			}
		};
	}

	return { props: { statusCode: 404 } };
});