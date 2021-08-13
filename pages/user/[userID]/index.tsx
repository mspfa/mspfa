import './styles.module.scss';
import Page from 'components/Page';
import { useUser } from 'lib/client/users';
import type { PublicUser } from 'lib/client/users';
import { getUserByUnsafeID, getPublicUser } from 'lib/server/users';
import { withErrorPage } from 'lib/client/errors';
import { withStatusCode } from 'lib/server/errors';
import Box from 'components/Box';
import BoxColumns from 'components/Box/BoxColumns';
import BoxSection from 'components/Box/BoxSection';
import BoxRowSection from 'components/Box/BoxRowSection';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import Timestamp from 'components/Timestamp';
import Link from 'components/Link';
import BoxFooter from 'components/Box/BoxFooter';
import IconImage from 'components/IconImage';
import { Perm } from 'lib/client/perms';
import BoxRow from 'components/Box/BoxRow';
import BBCode from 'components/BBCode';
import { getPublicStoriesByEditor } from 'lib/server/stories';
import type { PublicStory } from 'lib/client/stories';
import List from 'components/List';
import StoryListing from 'components/StoryListing';
import Button from 'components/Button';
import type { integer } from 'lib/types';

type ServerSideProps = {
	publicUser: PublicUser,
	publicStories: PublicStory[],
	favsPublic: boolean
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ publicUser, publicStories, favsPublic }) => {
	const user = useUser();

	const notOwnProfile = user?.id !== publicUser.id;

	return (
		<Page withFlashyTitle heading="Profile">
			<Box id="profile">
				<BoxColumns>
					<BoxSection id="profile-info" heading="Info">
						<BoxRow id="profile-name">
							{publicUser.name}
						</BoxRow>
						<BoxRow id="profile-icon-container">
							<IconImage
								id="profile-icon"
								src={publicUser.icon}
								alt={`${publicUser.name}'s Icon`}
							/>
						</BoxRow>
						<BoxRow id="profile-actions">
							{notOwnProfile && (
								<div>
									<Link href={`/message/new?to=${publicUser.id}`}>
										Send Message
									</Link>
								</div>
							)}
							{favsPublic && (
								<div>
									<Link href={`/user/${publicUser.id}/favs`}>
										View Favorites
									</Link>
								</div>
							)}
							{notOwnProfile && (
								<div>
									<Link href="/TODO">
										Report
									</Link>
								</div>
							)}
						</BoxRow>
					</BoxSection>
					<Box id="profile-misc">
						<BoxRowSection id="profile-stats" heading="Stats">
							<LabeledBoxRow label="Last Connection">
								<Timestamp relative withTime>
									{publicUser.lastSeen}
								</Timestamp>
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
							<BoxRowSection id="profile-contact" heading="Contact">
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
						<BBCode html>{publicUser.description}</BBCode>
					</BoxSection>
				)}
				{!!publicStories.length && (
					<BoxSection
						id="profile-stories"
						heading={`${publicUser.name}'s Adventures`}
						collapsible
						open
					>
						<List listing={StoryListing}>
							{publicStories}
						</List>
					</BoxSection>
				)}
				{user && (
					user.id === publicUser.id
					|| !!(user.perms & Perm.sudoRead)
				) && (
					<BoxFooter>
						<Button href={`/user/${publicUser.id}/edit`}>
							Edit
						</Button>
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
				publicUser: getPublicUser(userFromParams),
				publicStories: await getPublicStoriesByEditor(userFromParams),
				favsPublic: userFromParams.settings.favsPublic
			}
		};
	}

	return { props: { statusCode: 404 } };
});