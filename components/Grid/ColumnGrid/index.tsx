import Grid from 'components/Grid';
import type { GridProps } from 'components/Grid';
import './styles.module.scss';

export type ColumnGridProps = GridProps;

/** A `Grid` which places its contained `GridSection`s in columns (or rows if on mobile). */
const ColumnGrid = ({ className, ...props }: ColumnGridProps) => (
	<Grid
		className={`column-grid${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default ColumnGrid;