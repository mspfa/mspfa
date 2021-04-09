import type { ReactNode } from 'react';
import './styles.module.scss';

export type PageHeadingProps = { children: ReactNode };

const PageHeading = ({ children }: PageHeadingProps) => (
	<div className="page-heading">
		{children}
	</div>
);

export default PageHeading;