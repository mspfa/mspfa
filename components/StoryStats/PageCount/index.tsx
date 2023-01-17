import './styles.module.scss';
import Icon from 'components/Icon';
import type { HTMLAttributes } from 'react';
import type { integer } from 'lib/types';
import classes from 'lib/client/classes';

export type PageCountProps = Omit<HTMLAttributes<HTMLSpanElement>, 'title' | 'children'> & {
	children: integer
};

const PageCount = ({ className, children, ...props }: PageCountProps) => (
	<span
		className={classes('page-count', className)}
		title={`${children} Page${children === 1 ? '' : 's'}`}
		{...props}
	>
		<Icon>{children}</Icon>
	</span>
);

export default PageCount;
