import './styles.module.scss';
import type { LabeledIconProps } from 'components/LabeledIcon';
import LabeledIcon from 'components/LabeledIcon';

export type PagesIconProps = Omit<LabeledIconProps, 'title'>;

const PagesIcon = ({ className, children, ...props }: PagesIconProps) => (
	<LabeledIcon
		className={`pages${className ? ` ${className}` : ''}`}
		title={`${children instanceof Object ? '' : `${children} `}Pages`}
		{...props}
	>
		{children}
	</LabeledIcon>
);

export default PagesIcon;