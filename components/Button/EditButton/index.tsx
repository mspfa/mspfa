import './styles.module.scss';
import Link from 'components/Link';
import type { LinkProps } from 'components/Link';
import type { StoryID } from 'modules/server/stories';

export type EditButtonProps = Omit<LinkProps, 'title' | 'href'> & {
	storyID: StoryID
};

const EditButton = ({ storyID, className, ...props }: EditButtonProps) => (
	<Link
		className={`button icon edit${className ? ` ${className}` : ''}`}
		title="Edit"
		href={`/s/${storyID}/edit/pages`}
		{...props}
	/>
);

export default EditButton;