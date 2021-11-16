import './styles.module.scss';
import type { ClientColor } from 'lib/client/colors';
import type { HTMLAttributes } from 'react';

export type ColorCellProps = Omit<HTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'title' | 'style'> & {
	children: ClientColor
};

/** A clickable cell representing a `ClientColor`. */
const ColorCell = ({
	children: color,
	...props
}: ColorCellProps) => (
	<button
		type="button"
		className="color-cell input-like"
		title={`${color.name} (${color.value})`}
		style={{ backgroundColor: color.value }}
		data-value={color.value}
		{...props}
	/>
);

export default ColorCell;