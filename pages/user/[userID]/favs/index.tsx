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
import { StoryPrivacy } from 'modules/client/stories';
import List from 'components/List';
import StoryListing from 'components/StoryListing';
import { Perm } from 'modules/client/perms';
import type { FilterQuery } from 'mongodb';

type ServerSideProps = {
	publicUser: PublicUser,
	favsPublic: boolean,
	publicStories: PublicStory[]
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ publicUser, favsPublic, publicStories }) => (
	<Page flashyTitle heading="Favorite Adventures">
		<Box>
			<BoxSection heading={`${publicUser.name}'s Favorites`}>
				<BoxRow>
					<Link href={`/user/${publicUser.id}`}>
						Back to Profile
					</Link>
				</BoxRow>
				{!favsPublic && (
					<BoxRow className="translucent-text">
						Only you can see your favorites. If you want others to be able to see, enable public favorites in <Link href={`/user/${publicUser.id}/edit`}>your profile settings</Link>.
					</BoxRow>
				)}
				<BoxRow>
					{(publicStories.length
						? (
							<List listing={StoryListing}>
								{publicStories}
							</List>
						)
						: 'This user has no favorite adventures.'
					)}
				</BoxRow>
			</BoxSection>
		</Box>
	</Page>
));

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const userFromParams = await getUserByUnsafeID(params.userID);

	if (!userFromParams) {
		return { props: { statusCode: 404 } };
	}

	const readPerms = !!(
		req.user && (
			req.user._id.equals(userFromParams._id)
			|| req.user.perms & Perm.sudoRead
		)
	);

	if (!(userFromParams.settings.favsPublic || readPerms)) {
		return { props: { statusCode: 403 } };
	}

	/** Queries non-deleted favorites of the user from params. */
	const favsFilterQuery: FilterQuery<StoryDocument> = {
		_id: { $in: userFromParams.favs },
		willDelete: { $exists: false }
	};

	/** Queries public adventures, or both public and unlisted adventures if the user is viewing their own favorites page. */
	const privacyFilterQuery: FilterQuery<StoryDocument> = {
		privacy: (
			readPerms
				// A user should be able to see unlisted adventures which they favorited.
				? { $in: [StoryPrivacy.Public, StoryPrivacy.Unlisted] }
				// Other users should not.
				: StoryPrivacy.Public
		)
	};

	return {
		props: {
			publicUser: getPublicUser(userFromParams),
			favsPublic: userFromParams.settings.favsPublic,
			publicStories: await stories.find!(
				req.user
					? req.user.perms & Perm.sudoRead
						? favsFilterQuery
						: {
							$and: [favsFilterQuery, {
								$or: [privacyFilterQuery, {
									$and: [{
										privacy: (
											readPerms
												// If the user is viewing their own favorites page, they can already see unlisted adventures via `privacyFilterQuery`.
												? StoryPrivacy.Private
												: { $in: [StoryPrivacy.Unlisted, StoryPrivacy.Private] }
										)
									}, {
										// Only show unlisted/private adventures which the user owns or edits.
										$or: [
											{ owner: req.user._id },
											{ editors: req.user._id }
										]
									}]
								}]
							}]
						}
					: Object.assign(favsFilterQuery, privacyFilterQuery)
			).map(getPublicStory).toArray()
		}
	};
});