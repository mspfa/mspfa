import './styles.module.scss';
import type { LabeledIconProps } from 'components/LabeledIcon';
import LabeledIcon from 'components/LabeledIcon';

export type PagesIconProps = Omit<LabeledIconProps, 'title' | 'children'> & {
	children: number
};

const PagesIcon = ({ className, children, ...props }: PagesIconProps) => (
	<LabeledIcon
		className={`pages${className ? ` ${className}` : ''}`}
		title={`${children} Page${children === 1 ? '' : 's'}`}
		{...props}
	>
		{children}
	</LabeledIcon>
);

export default PagesIcon;