import { Field, useField } from 'formik';
import type { ChangeEvent, InputHTMLAttributes, RefObject } from 'react';
import { useRef } from 'react';
import { hashlessColorCodeTest } from 'components/BBCode/BBTags';
import useFunction from 'lib/client/reactHooks/useFunction';
import { usePrefixedID } from 'lib/client/IDPrefix';
import toKebabCase from 'lib/client/toKebabCase';

const getTwoDigitHex = (dec: string) => `0${(+dec).toString(16)}`.slice(-2);

export type ColorPickerProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'required' | 'disabled' | 'readOnly' | 'autoFocus'> & {
	name: string,
	innerRef?: RefObject<HTMLInputElement>
};

const ColorPicker = ({ name, required, disabled, readOnly, autoFocus, innerRef }: ColorPickerProps) => {
	const id = usePrefixedID(`field-${toKebabCase(name)}`);

	const [, { value }, { setValue }] = useField<string>(name);

	const colorComputerRef = useRef<HTMLSpanElement>(null);

	let computedHexColor;
	let computedOpacity = 1;

	// Compute `computedHexColor` and `computedOpacity`.
	if (colorComputerRef.current) {
		// Reset the color before setting the new one, because setting an invalid color doesn't necessarily reset it.
		colorComputerRef.current.style.color = '';
		colorComputerRef.current.style.color = value.replace(hashlessColorCodeTest, '#$1');

		const rgbaMatch = getComputedStyle(colorComputerRef.current).color.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
		if (rgbaMatch) {
			computedHexColor = (
				'#'
				+ getTwoDigitHex(rgbaMatch[1])
				+ getTwoDigitHex(rgbaMatch[2])
				+ getTwoDigitHex(rgbaMatch[3])
			);

			if (rgbaMatch[4]) {
				computedOpacity = +rgbaMatch[4];
			}
		}
	}

	return (
		<>
			<span
				className="color-picker-color-computer"
				ref={colorComputerRef}
			/>
			<input
				type="color"
				className="spaced"
				disabled={disabled}
				readOnly={readOnly}
				style={{
					opacity: computedOpacity
				}}
				value={
					colorComputerRef.current
						? computedHexColor
						: value
				}
				onChange={
					useFunction((event: ChangeEvent<HTMLInputElement>) => {
						setValue(event.target.value);
					})
				}
			/>
			<Field
				id={id}
				name={name}
				className="spaced"
				required={required}
				disabled={disabled}
				readOnly={readOnly}
				autoFocus={autoFocus}
				size={9}
				innerRef={innerRef}
			/>
		</>
	);
};

export default ColorPicker;