import './styles.module.scss';
import Page from 'components/Page';
import { useUser } from 'lib/client/reactContexts/UserContext';
import type { PublicUser } from 'lib/client/users';
import { getPublicUser } from 'lib/server/users';
import getUserByUnsafeID from 'lib/server/users/getUserByUnsafeID';
import { withErrorPage } from 'lib/client/errors';
import withStatusCode from 'lib/server/withStatusCode';
import Columns from 'components/Columns';
import Section from 'components/Section';
import LabeledGridSection from 'components/Section/LabeledGridSection';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import Timestamp from 'components/Timestamp';
import Link from 'components/Link';
import BottomActions from 'components/BottomActions';
import IconImage from 'components/IconImage';
import { Perm } from 'lib/client/perms';
import Row from 'components/Row';
import BBCode from 'components/BBCode';
import getPublicStoriesByEditor from 'lib/server/stories/getPublicStoriesByEditor';
import type { PublicStory } from 'lib/client/stories';
import List from 'components/List';
import StoryListing from 'components/StoryListing';
import Button from 'components/Button';
import type { integer } from 'lib/types';
import Icon from 'components/Icon';
import { useEffect } from 'react';
import getStoriesAsUser from 'lib/server/stories/getStoriesAsUser';

type ServerSideProps = {
	publicUser: PublicUser,
	stories: PublicStory[],
	favsPublic: boolean,
	favCount?: integer
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ publicUser, stories, favsPublic, favCount }) => {
	const user = useUser();

	const notOwnProfile = user?.id !== publicUser.id;

	/** Whether the user was last seen at least five minutes ago. */
	const online = publicUser.lastSeen >= Date.now() - 1000 * 60 * 5;

	// Add the `user-online` class to the root element if the user is online.
	useEffect(() => {
		document.documentElement.classList[online ? 'add' : 'remove']('user-online');

		if (online) {
			return () => {
				document.documentElement.classList.remove('user-online');
			};
		}
	}, [online]);

	return (
		<Page
			withFlashyTitle
			heading={publicUser.name}
		>
			<div id="profile">
				<Columns ofSections>
					<Section id="profile-info" heading="Info">
						<Row id="profile-icon-container">
							<IconImage
								id="profile-icon"
								src={publicUser.icon}
								alt={`${publicUser.name}'s Icon`}
							/>
						</Row>
						<Row id="profile-status">
							<Icon>
								{online ? 'Online!' : 'Offline'}
							</Icon>
						</Row>
						<Row id="profile-actions">
							{notOwnProfile && (
								<Link
									className="profile-action"
									href={`/messages/new?to=${publicUser.id}`}
								>
									Send Message
								</Link>
							)}
							{favsPublic && (
								<Link
									className="profile-action"
									href={`/users/${publicUser.id}/favs`}
								>
									{`View Favorites (${favCount})`}
								</Link>
							)}
							{notOwnProfile && (
								<Link
									className="profile-action"
									href="/TODO"
								>
									Report
								</Link>
							)}
						</Row>
					</Section>
					<div id="profile-misc">
						<LabeledGridSection id="profile-stats" heading="Stats">
							<LabeledGridRow label="Last Connection">
								{online ? (
									'Online!'
								) : (
									<Timestamp relative withTime>
										{publicUser.lastSeen}
									</Timestamp>
								)}
							</LabeledGridRow>
							<LabeledGridRow label="Joined MSPFA">
								<Timestamp>{publicUser.created}</Timestamp>
							</LabeledGridRow>
							{publicUser.birthdate && (
								<LabeledGridRow label="Birthdate">
									<Timestamp>{publicUser.birthdate}</Timestamp>
								</LabeledGridRow>
							)}
						</LabeledGridSection>
						{(publicUser.email || publicUser.site) && (
							<LabeledGridSection id="profile-contact" heading="Contact">
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
							</LabeledGridSection>
						)}
					</div>
				</Columns>
				{publicUser.description && (
					<Section
						id="profile-description"
						heading="Description"
						collapsible
						open
					>
						<BBCode keepHTMLTags>
							{publicUser.description}
						</BBCode>
					</Section>
				)}
				{stories.length !== 0 && (
					<Section
						id="profile-stories"
						heading={`${publicUser.name}'s Adventures (${stories.length})`}
						collapsible
						open
					>
						<List listing={StoryListing}>
							{stories}
						</List>
					</Section>
				)}
			</div>
			{user && (
				user.id === publicUser.id
				|| !!(user.perms & Perm.sudoRead)
			) && (
				<BottomActions>
					<Button href={`/users/${publicUser.id}/edit`}>
						Edit
					</Button>
				</BottomActions>
			)}
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
				stories: await getPublicStoriesByEditor(userFromParams),
				favsPublic: userFromParams.settings.favsPublic,
				...userFromParams.settings.favsPublic && {
					favCount: (
						// Show only the public fav count on the user's profile no matter who you are, so that everyone sees the same number.
						await getStoriesAsUser(undefined, false, {
							_id: { $in: userFromParams.favs }
						}).count()
					)
				}
			}
		};
	}

	return { props: { statusCode: 404 } };
});