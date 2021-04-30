import './styles.module.scss';
import GridSection from 'components/Grid/GridSection';
import type { GridSectionProps } from 'components/Grid/GridSection';

export type GridRowSectionProps = GridSectionProps;

/** A `GridSection`, by default with two columns, to put `GridRow`s (of any variant) in. */
const GridRowSection = ({ className, ...props }: GridRowSectionProps) => (
	<GridSection
		className={`grid-row-section${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default GridRowSection;