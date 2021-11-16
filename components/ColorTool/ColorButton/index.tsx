import './styles.module.scss';
import type { ClientColor } from 'lib/client/colors';
import type { CSSProperties } from 'react';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';

export type ColorButtonProps = Omit<ButtonProps, 'children' | 'icon' | 'className' | 'title' | 'style'> & {
	children: ClientColor
};

/** An icon button representing a `ClientColor`. */
const ColorButton = ({
	children: color,
	...props
}: ColorButtonProps) => (
	<Button
		id={`color-button-${color.id}`}
		icon
		className="color-button"
		title={
			color.name === color.value
				? color.name
				: `${color.name} (${color.value})`
		}
		style={{
			'--button-color': color.value
		} as CSSProperties}
		{...props}
	/>
);

export default ColorButton;