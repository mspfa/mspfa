import './styles.module.scss';
import Page from 'components/Page';
import { useUser } from 'modules/client/users';
import type { PublicUser } from 'modules/client/users';
import { getUserByUnsafeID, getPublicUser } from 'modules/server/users';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Box from 'components/Box';
import BoxColumns from 'components/Box/BoxColumns';
import BoxSection from 'components/Box/BoxSection';
import BoxRowSection from 'components/Box/BoxRowSection';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import Timestamp from 'components/Timestamp';
import Link from 'components/Link';
import BoxFooter from 'components/Box/BoxFooter';
import IconImage from 'components/IconImage';
import { Perm } from 'modules/client/perms';
import BoxRow from 'components/Box/BoxRow';

type ServerSideProps = {
	publicUser: PublicUser
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicUser }) => {
	const user = useUser();

	return (
		<Page flashyTitle heading="Profile">
			<Box id="profile-box">
				<BoxColumns>
					<BoxSection heading="Meta">
						<BoxRow id="profile-name">
							{publicUser.name}
						</BoxRow>
						<BoxRow id="profile-icon">
							<IconImage src={publicUser.icon} />
						</BoxRow>
					</BoxSection>
					<Box>
						<BoxRowSection heading="Stats">
							<LabeledBoxRow label="Last Connection">
								<Timestamp relative withTime>{publicUser.lastSeen}</Timestamp>
							</LabeledBoxRow>
							<LabeledBoxRow label="Joined MSPFA">
								<Timestamp>{publicUser.created}</Timestamp>
							</LabeledBoxRow>
							{publicUser.birthdate && (
								<LabeledBoxRow label="Birthdate">
									<Timestamp>{publicUser.birthdate}</Timestamp>
								</LabeledBoxRow>
							)}
						</BoxRowSection>
						{(publicUser.email || publicUser.site) && (
							<BoxRowSection heading="Contact">
								{publicUser.email && (
									<LabeledBoxRow label="Email">
										<Link
											href={`mailto:${publicUser.email}`}
											target="_blank"
										>
											{publicUser.email}
										</Link>
									</LabeledBoxRow>
								)}
								{publicUser.site && (
									<LabeledBoxRow label="Website">
										<Link
											href={publicUser.site}
											target="_blank"
										>
											{publicUser.site}
										</Link>
									</LabeledBoxRow>
								)}
							</BoxRowSection>
						)}
					</Box>
				</BoxColumns>
				{publicUser.description && (
					<BoxSection id="profile-description" heading="Description">
						{publicUser.description}
					</BoxSection>
				)}
				{user && (
					user.id === publicUser.id
					|| user.perms & Perm.sudoRead
				) && (
					<BoxFooter>
						<Link
							className="button"
							href={`/u/${publicUser.id}/edit`}
						>
							Edit
						</Link>
					</BoxFooter>
				)}
			</Box>
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