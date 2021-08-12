import './styles.module.scss';
import type { HTMLAttributes } from 'react';

export type StoryTagLinkContainerProps = HTMLAttributes<HTMLDivElement>;

/** A container for `StoryTagLink`s, which must be directly inside this component. Can include other children too if they should be styled similarly. */
const StoryTagLinkContainer = ({ className, ...props }: StoryTagLinkContainerProps) => (
	<div
		className={`story-tag-link-container${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default StoryTagLinkContainer;