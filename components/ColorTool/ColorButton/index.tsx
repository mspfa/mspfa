import './styles.module.scss';
import type { ClientColor } from 'lib/client/colors';
import type { CSSProperties } from 'react';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useField, useFormikContext } from 'formik';
import type { ColorFieldProps } from 'components/ColorField';

export type ColorButtonProps = Omit<ButtonProps, 'children' | 'icon' | 'className' | 'title' | 'style' | 'onClick'> & {
	/** The `name` of the Formik field to set the value of the selected color into. */
	name: ColorFieldProps['name'],
	children: ClientColor
};

/** An icon button representing a `ClientColor`. */
const ColorButton = ({
	name,
	children: color,
	...props
}: ColorButtonProps) => {
	const [, , { setValue }] = useField<string>(name);
	const { submitForm } = useFormikContext();

	return (
		<Button
			icon
			className="color-button"
			title={
				color.name === color.value
					? color.name
					: `${color.name} (${color.value})`
			}
			style={
				{ '--button-color': color.value } as CSSProperties
			}
			onClick={
				useFunction(() => {
					setValue(color.value);
					submitForm();
				})
			}
			{...props}
		/>
	);
};

export default ColorButton;