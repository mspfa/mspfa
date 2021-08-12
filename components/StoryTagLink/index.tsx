import './styles.module.scss';
import Link from 'components/Link';

export type StoryTagLinkProps = {
	children: string
};

/** A link for a story's tag. Should always be directly inside a `StoryTagLinkContainer`. */
const StoryTagLink = ({ children }: StoryTagLinkProps) => (
	<Link className="story-tag-link">
		{`#${children}`}
	</Link>
);

export default StoryTagLink;