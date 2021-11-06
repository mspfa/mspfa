import './styles.module.scss';
import Page from 'components/Page';
import { Perm } from 'lib/client/perms';
import { permToGetUserInPage } from 'lib/server/permToGetUser';
import { withErrorPage } from 'lib/client/errors';
import { withStatusCode } from 'lib/server/errors';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import List from 'components/List';
import type { integer } from 'lib/types';
import type { StorySave } from 'components/StorySaveListing';
import StorySaveListing from 'components/StorySaveListing';
import findStoriesAsUser from 'lib/server/findStoriesAsUser';
import getRandomImageFilename from 'lib/server/getRandomImageFilename';
import useFunction from 'lib/client/useFunction';
import { useState } from 'react';
import type { StoryID } from 'lib/server/stories';
import Row from 'components/Row';
import { useUser } from 'lib/client/users';
import { useRouter } from 'next/router';

type ServerSideProps = {
	storySaves: StorySave[],
	imageFilename: string
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({
	storySaves: initialStorySaves,
	imageFilename
}) => {
	const [storySaves, setStorySaves] = useState(initialStorySaves);

	const user = useUser();

	const queriedUserID = useRouter().query.userID as string;

	const removeListing = useFunction((storySave: StorySave) => {
		const storySaveIndex = storySaves.findIndex(({ id }) => id === storySave.id);

		setStorySaves([
			...storySaves.slice(0, storySaveIndex),
			...storySaves.slice(storySaveIndex + 1, storySaves.length)
		]);
	});

	return (
		<Page withFlashyTitle heading="Your Game Saves">
			<Box>
				<BoxSection id="story-saves-section" heading="Game Saves">
					{storySaves.length ? (
						<List
							listing={StorySaveListing}
							removeListing={removeListing}
						>
							{storySaves}
						</List>
					) : (
						<>
							<Row>
								<img
									src={`/images/no-story-saves/${imageFilename}`}
									alt="Artwork for No Game Saves"
									title={`Artist: ${imageFilename.slice(0, imageFilename.indexOf('.'))}`}
								/>
							</Row>
							<Row>
								{(queriedUserID === user?.id
									? 'You have no saved games.'
									: 'This user has no saved games.'
								)}
							</Row>
						</>
					)}
				</BoxSection>
			</Box>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const { user, statusCode } = await permToGetUserInPage(req, params.userID, Perm.sudoRead);

	if (statusCode) {
		return { props: { statusCode } };
	}

	const storyIDs = Object.keys(user!.storySaves).map(Number);

	const storySaves: StorySave[] = [];
	const storySaveRecord: Record<StoryID, StorySave> = {};

	for (const storyID of storyIDs) {
		const storySave: StorySave = {
			id: storyID,
			pageID: user!.storySaves[storyID]
		};

		storySaves.push(storySave);
		storySaveRecord[storyID] = storySave;
	}

	await findStoriesAsUser(user, true, {
		_id: { $in: storyIDs }
	}).forEach(story => {
		storySaveRecord[story.id].story = story;
	});

	return {
		props: {
			storySaves,
			imageFilename: await getRandomImageFilename('public/images/no-story-saves')
		}
	};
});