import './styles.module.scss';
import type { RowProps } from 'components/Row';
import Row from 'components/Row';

export type BoxRowProps = RowProps;

/** A centered row with one column that spans the full width of the box. */
const BoxRow = ({ className, ...props }: BoxRowProps) => (
	<Row
		className={`box-row${className ? ` ${className}` : ''}`}
		{...props}
	/>
);

export default BoxRow;