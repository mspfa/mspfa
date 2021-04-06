import type { ReactNode } from 'react';
import './styles.module.scss';

export type HeadingProps = { children: ReactNode };

const Heading = ({ children }: HeadingProps) => (
	<h1 className="heading layer-front translucent-text">
		{children}
	</h1>
);

export default Heading;