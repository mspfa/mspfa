import './styles.module.scss';
import Link from 'components/Link';
import type { LinkProps } from 'components/Link';

export type EditButtonProps = Omit<LinkProps, 'title' | 'href'> & {
	storyID: number
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