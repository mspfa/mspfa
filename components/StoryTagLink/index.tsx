import './styles.module.scss';
import Link from 'components/Link';
import storyTags from 'lib/client/storyTags';

export type StoryTagLinkProps = {
	children: string
};

/** A link for a story's tag. Should always be directly inside an `InconspicuousDiv`. */
const StoryTagLink = ({ children }: StoryTagLinkProps) => (
	<Link
		className="story-tag-link"
		title={storyTags[children] || '(Unknown Tag)'}
	>
		{`#${children}`}
	</Link>
);

export default StoryTagLink;