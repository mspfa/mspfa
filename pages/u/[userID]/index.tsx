import './styles.module.scss';
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
import LabeledGridRow from 'components/Grid/LabeledGridRow';
import Timestamp from 'components/Timestamp';
import Link from 'components/Link';
import GridFooter from 'components/Grid/GridFooter';
import IconImage from 'components/IconImage';
import { Perm } from 'modules/client/perms';

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
				<ColumnGrid>
					<Grid id="profile-meta-grid">
						<GridSection id="profile-meta" heading="Meta">
							<div id="profile-name">
								{publicUser.name}
							</div>
							<IconImage id="profile-icon" src={publicUser.icon} />
						</GridSection>
					</Grid>
					<Grid>
						<GridRowSection heading="Stats">
							<LabeledGridRow label="Last Connection">
								<Timestamp relative withTime>{publicUser.lastSeen}</Timestamp>
							</LabeledGridRow>
							<LabeledGridRow label="Joined MSPFA">
								<Timestamp>{publicUser.created}</Timestamp>
							</LabeledGridRow>
							{publicUser.birthdate && (
								<LabeledGridRow label="Birthdate">
									<Timestamp>{publicUser.birthdate}</Timestamp>
								</LabeledGridRow>
							)}
						</GridRowSection>
						{(publicUser.email || publicUser.site) && (
							<GridRowSection heading="Contact">
								{publicUser.email && (
									<LabeledGridRow label="Email">
										<Link
											href={`mailto:${publicUser.email}`}
											target="_blank"
										>
											{publicUser.email}
										</Link>
									</LabeledGridRow>
								)}
								{publicUser.site && (
									<LabeledGridRow label="Website">
										<Link
											href={publicUser.site}
											target="_blank"
										>
											{publicUser.site}
										</Link>
									</LabeledGridRow>
								)}
							</GridRowSection>
						)}
					</Grid>
				</ColumnGrid>
				{publicUser.description && (
					<GridSection id="profile-description" heading="Description">
						{publicUser.description}
					</GridSection>
				)}
				{user && (
					user.id === publicUser.id
					|| user.perms & Perm.sudoRead
				) && (
					<GridFooter>
						<Link
							className="button"
							href={`/u/${publicUser.id}/edit`}
						>
							Edit
						</Link>
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