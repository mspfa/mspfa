import type { ReactNode } from 'react';
import './styles.module.scss';

export type GridSectionProps = { children: ReactNode };

const GridSection = ({ children }: GridSectionProps) => (
	<section className="grid-section layer-front">
		{children}
	</section>
);

export default GridSection;