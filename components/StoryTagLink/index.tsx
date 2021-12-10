import './styles.module.scss';
import Link from 'components/Link';
import type { TagString } from 'lib/client/storyTags';
import storyTags from 'lib/client/storyTags';

export type StoryTagLinkProps = {
	children: TagString
};

/** A link for a story's tag. Should always be directly inside an `InconspicuousDiv`. */
const StoryTagLink = ({ children: tagString }: StoryTagLinkProps) => (
	<Link
		className="story-tag-link"
		href={`/browse/stories?tags=${tagString}`}
		title={storyTags[tagString] || '(Custom Tag)'}
	>
		{`#${tagString}`}
	</Link>
);

export default StoryTagLink;