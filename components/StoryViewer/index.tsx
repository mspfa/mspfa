import Page from 'components/Page';
import type { PublicStory } from 'modules/client/stories';

export type StoryViewerProps = {
	story: PublicStory
};

const StoryViewer = ({ story }: StoryViewerProps) => (
	<Page>
		{story.title}
	</Page>
);

export default StoryViewer;