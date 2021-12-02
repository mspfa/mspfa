import { Field, useField } from 'formik';
import type { ChangeEvent, InputHTMLAttributes, RefObject } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { usePrefixedID } from 'lib/client/reactContexts/IDPrefix';
import toKebabCase from 'lib/client/toKebabCase';
import addHashToColor from 'lib/client/addHashToColor';

const getTwoDigitHex = (dec: string) => `0${(+dec).toString(16)}`.slice(-2);

const dummyElement = document.getElementById('dummy') as HTMLDivElement; // @client-only

export type ColorFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'disabled' | 'readOnly' | 'autoFocus'> & {
	name: string,
	innerRef?: RefObject<HTMLInputElement>
};

const ColorField = ({ id, name, required, disabled, readOnly, autoFocus, innerRef }: ColorFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const [, { value }, { setValue }] = useField<string>(name);

	let computedHexColor;
	let computedOpacity = 1;

	// Compute `computedHexColor` and `computedOpacity` (only client-side).
	if (typeof window !== 'undefined') {
		// Reset the color before setting the new one, because setting an invalid color doesn't necessarily reset it.
		dummyElement.style.color = '';
		dummyElement.style.color = addHashToColor(value);
		const computedColor = getComputedStyle(dummyElement).color;
		dummyElement.style.color = '';

		const rgbaMatch = computedColor.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
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
			<input
				type="color"
				className="spaced"
				disabled={disabled}
				readOnly={readOnly}
				style={{
					opacity: computedOpacity
				}}
				value={
					typeof window === 'undefined'
						? value
						: computedHexColor
				}
				onChange={
					useFunction((event: ChangeEvent<HTMLInputElement>) => {
						setValue(event.target.value);
					})
				}
				suppressHydrationWarning
			/>
			<Field
				id={id}
				name={name}
				className="spaced"
				size={9}
				maxLength={50}
				required={required}
				disabled={disabled}
				readOnly={readOnly}
				autoFocus={autoFocus}
				innerRef={innerRef}
			/>
		</>
	);
};

export default ColorField;