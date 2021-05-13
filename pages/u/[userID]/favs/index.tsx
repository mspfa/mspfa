import Page from 'components/Page';
import type { PublicUser } from 'modules/client/users';
import { getUserByUnsafeID, getPublicUser } from 'modules/server/users';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import Link from 'components/Link';
import BoxRow from 'components/Box/BoxRow';
import type { StoryDocument } from 'modules/server/stories';
import stories, { getPublicStory } from 'modules/server/stories';
import type { PublicStory } from 'modules/client/stories';
import StoryList from 'components/StoryList';
import { Perm } from 'modules/client/perms';

type ServerSideProps = {
	publicUser: PublicUser,
	favsPublic: boolean,
	publicStories?: PublicStory[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicUser, favsPublic, publicStories }) => (
	<Page flashyTitle heading="Favorite Adventures">
		<Box id="profile-box">
			<BoxSection heading={`${publicUser.name}'s Favorites`}>
				<BoxRow>
					<Link href={`/u/${publicUser.id}`}>
						Back to Profile
					</Link>
				</BoxRow>
				{!favsPublic && publicStories && (
					<BoxRow>
						Only you can see this page.
					</BoxRow>
				)}
				<BoxRow>
					{publicStories ? (
						<StoryList>{publicStories}</StoryList>
					) : "This user's favorite adventures are private."}
				</BoxRow>
			</BoxSection>
		</Box>
	</Page>
));

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const userFromParams = await getUserByUnsafeID(params.userID);

	if (userFromParams) {
		return {
			props: {
				publicUser: getPublicUser(userFromParams),
				favsPublic: userFromParams.settings.favsPublic,
				...(
					userFromParams.settings.favsPublic || (
						req.user && (
							req.user._id.equals(userFromParams._id)
							|| req.user.perms & Perm.sudoRead
						)
					)
				) && {
					publicStories: (
						(
							(await Promise.all(
								userFromParams.favs.map(
									fav => stories.findOne({ _id: fav })
								)
							)).filter(Boolean) as StoryDocument[]
						).map(getPublicStory)
					)
				}
			}
		};
	}

	return { props: { statusCode: 404 } };
});