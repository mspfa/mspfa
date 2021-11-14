import type { ChangeEvent } from 'react';
import { useEffect, useRef } from 'react';
import { hashlessColorCodeTest } from 'components/BBCode/BBTags';
import { Field, useField } from 'formik';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import SaveButton from 'components/Button/SaveButton';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/useFunction';

const getTwoDigitHex = (dec: string) => `0${(+dec).toString(16)}`.slice(-2);

export type ColorPickerProps = {
	name: string
};

const ColorPicker = ({ name }: ColorPickerProps) => {
	const [, { value }, { setValue }] = useField<string>(name);

	const textInputRef = useRef<HTMLInputElement>(null!);
	const colorComputerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		textInputRef.current.select();
	}, []);

	let computedColor;
	let computedOpacity = 1;

	// Compute `computedColor` and `computedOpacity`.
	if (colorComputerRef.current) {
		// Reset the color before setting the new one, because setting an invalid color doesn't necessarily reset it.
		colorComputerRef.current.style.color = '';
		colorComputerRef.current.style.color = value.replace(hashlessColorCodeTest, '#$1');

		const { color } = getComputedStyle(colorComputerRef.current);
		const rgbaMatch = color.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);

		if (rgbaMatch) {
			computedColor = '#';
			computedColor += getTwoDigitHex(rgbaMatch[1]);
			computedColor += getTwoDigitHex(rgbaMatch[2]);
			computedColor += getTwoDigitHex(rgbaMatch[3]);

			if (rgbaMatch[4]) {
				computedOpacity = +rgbaMatch[4];
			}
		}
	}

	// TODO: Implement color saving.

	return (
		<>
			<div
				id="bb-tool-color-computer"
				ref={colorComputerRef}
			/>
			<LabeledGrid>
				<LabeledGridRow htmlFor="bb-tool-field-attributes" label="Color">
					<input
						type="color"
						className="spaced"
						style={{
							opacity: computedOpacity
						}}
						value={
							colorComputerRef.current
								? computedColor
								: value
						}
						onChange={
							useFunction((event: ChangeEvent<HTMLInputElement>) => {
								setValue(event.target.value);
							})
						}
					/>
					<Field
						id="bb-tool-field-attributes"
						name={name}
						className="spaced"
						required
						autoFocus
						size={9}
						innerRef={textInputRef}
					/>
					<SaveButton
						className="spaced"
						title="Save Color"
						onClick={
							useFunction(() => {

							})
						}
					/>
				</LabeledGridRow>
			</LabeledGrid>
		</>
	);
};

export default ColorPicker;