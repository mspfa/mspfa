import './styles.module.scss';
import { withErrorPage } from 'lib/client/errors';
import { Perm } from 'lib/client/perms';
import type { PublicStory, StoryLogListings } from 'lib/client/stories';
import { StoryPrivacy } from 'lib/client/stories';
import { withStatusCode } from 'lib/server/errors';
import { getPublicStory, getStoryByUnsafeID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import Page from 'components/Page';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import { useNavStoryID } from 'components/Nav';
import { Field, Form, Formik } from 'formik';
import { useRouter } from 'next/router';
import useFunction from 'lib/client/useFunction';
import Button from 'components/Button';

type ServerSideProps = {
	publicStory: PublicStory,
	results: StoryLogListings
} | {
	statusCode: integer
};

const Component = withErrorPage<ServerSideProps>(({ publicStory, results }) => {
	useNavStoryID(publicStory.id);

	const router = useRouter();
	const query = (
		typeof router.query.query === 'string'
			? router.query.query
			: ''
	);

	return (
		<Page withFlashyTitle heading="Adventure Search">
			<Box>
				<BoxSection heading={publicStory.title}>
					<Formik
						initialValues={{ query }}
						onSubmit={
							useFunction((values: { query: string }) => {
								const url = new URL(location.href);
								url.searchParams.set('query', values.query);
								router.replace(url);
							})
						}
					>
						<Form id="story-search-form">
							<Field name="query" className="spaced" autoFocus />
							<Button type="submit" className="spaced small">
								Search
							</Button>
						</Form>
					</Formik>
				</BoxSection>
			</Box>
		</Page>
	);
});

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params, query }) => {
	const story = await getStoryByUnsafeID(params.storyID);

	if (!story) {
		return { props: { statusCode: 404 } };
	}

	/** Whether the user is in preview mode (which allows accessing unpublished pages) and has permission to be in preview mode. */
	const previewMode = 'preview' in query;

	if ((
		previewMode
		|| story.privacy === StoryPrivacy.Private
	) && !(
		req.user && (
			story.owner.equals(req.user._id)
			|| story.editors.some(userID => userID.equals(req.user!._id))
			|| (req.user.perms & Perm.sudoRead)
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	const results: StoryLogListings = [];

	for (
		let pageID = (
			previewMode
				? Object.values(story.pages).length
				: story.pageCount
		);
		pageID > 0;
		pageID--
	) {
		const page = story.pages[pageID];

		if (!page.unlisted) {
			// TODO
		}
	}

	return {
		props: {
			publicStory: getPublicStory(story),
			results
		}
	};
});