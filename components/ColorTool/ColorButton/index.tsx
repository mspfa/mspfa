import './styles.module.scss';
import type { ClientColor } from 'lib/client/colors';
import type { CSSProperties } from 'react';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useField, useFormikContext } from 'formik';
import type { ColorFieldProps } from 'components/ColorField';
import EditButton from 'components/Button/EditButton';

export type ColorButtonProps = Omit<ButtonProps, 'children' | 'icon' | 'className' | 'title' | 'style' | 'onClick'> & {
	/** The `name` of the Formik field to set the value of the selected color into. */
	name: ColorFieldProps['name'],
	editing?: boolean,
	children: ClientColor
};

/** An icon button representing a `ClientColor`. */
const ColorButton = ({
	name,
	editing,
	children: color,
	...props
}: ColorButtonProps) => {
	const [, , { setValue }] = useField<string>(name);
	const { submitForm } = useFormikContext();

	const ColorButtonComponent = editing ? EditButton : Button;

	const button = (
		<ColorButtonComponent
			icon
			className={`color-button${editing ? ' editing spaced' : ''}`}
			title={
				editing
					? 'Edit Color'
					: color.name === color.value
						? color.name
						: `${color.name} (${color.value})`
			}
			style={
				{ '--button-color': color.value } as CSSProperties
			}
			onClick={
				useFunction(() => {
					if (editing) {

					} else {
						setValue(color.value);
						submitForm();
					}
				})
			}
			{...props}
		/>
	);

	return editing ? (
		<div className="color-button-container">
			{button}
			<span
				className="color-button-label spaced"
				title={color.value}
			>
				{color.name}
			</span>
		</div>
	) : (
		button
	);
};

export default ColorButton;