import type { ReactNode } from 'react';
import './styles.module.scss';

export type PageProps = { children: ReactNode };

const Page = ({ children }: PageProps) => (
	<div className="page-grid">
		{children}
	</div>
);

export default Page;