import './styles.module.scss';
import type { IconProps } from 'components/Icon';
import Icon from 'components/Icon';

export type PageCountProps = Omit<IconProps, 'title' | 'children'> & {
	children: number
};

const PageCount = ({ className, children, ...props }: PageCountProps) => (
	<span
		className={`page-count${className ? ` ${className}` : ''}`}
	>
		<Icon
			className="pages"
			title={`${children} Page${children === 1 ? '' : 's'}`}
			{...props}
		>
			{children}
		</Icon>
	</span>
);

export default PageCount;