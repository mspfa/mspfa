import './styles.module.scss';
import type { RowProps } from 'components/Row';
import Row from 'components/Row';

export type GridRowProps = RowProps;

/** A centered row with one column that spans the full width of the box. */
const GridRow = ({ className, ...props }: GridRowProps) => (
	<Row
		className={`grid-row${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default GridRow;