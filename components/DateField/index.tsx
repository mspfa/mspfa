import './styles.module.scss';
import { useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useCallback, useState } from 'react';

// @client-only {
const nativeInput = document.createElement('input');
nativeInput.type = 'number';
// @client-only }

const yearSize = new Date().getFullYear().toString().length + 2;

/** Gets the maximum possible day of the month based on a full year number (e.g. 2001) and a month number (0 to 11). */
const getMaxDay = (year: number, month: number) => {
	const maxDay = new Date(
		Number.isNaN(year) ? new Date().getFullYear() : year,
		month + 1,
		0
	).getDate();

	return Number.isNaN(maxDay) ? 31 : maxDay;
};

export type DateFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'min' | 'max' | 'onChange' | 'autoComplete'> & {
	name: string,
	/**
	 * The controlled value of the date field.
	 *
	 * If this is a string, it will automatically be converted to a number.
	 *
	 * If this is undefined, the field will be controlled by Formik.
	 */
	value?: number | string
};

const DateField = ({
	name,
	id = `field-${toKebabCase(name)}`,
	value: propValue,
	onChange: onChangeProp,
	required,
	min = 0,
	max = Date.now() + 1000 * 60 * 60 * 24 * 365 * 100,
	autoComplete
}: DateFieldProps) => {
	const [{ value: fieldValue }, , { setValue: setFieldValue }] = useField<number | undefined>(name);

	const date = (
		propValue === undefined
			? typeof fieldValue === 'number'
				? new Date(fieldValue)
				: undefined
			: new Date(
				typeof propValue === 'string'
					? propValue
						? +propValue
						: NaN
					: propValue
			)
	);

	let year = date ? date.getFullYear() : NaN;
	let month = date ? date.getMonth() : NaN;
	let day = date ? date.getDate() : NaN;

	const [fallbackValues, setFallbackValues] = useState({ year, month, day } as const);

	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
		({ year, month, day } = fallbackValues);
	}

	const onChange = useCallback((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		const targetType = event.target.id.slice(event.target.id.lastIndexOf('-') + 1) as 'year' | 'month' | 'day';

		const newValues = { year, month, day };
		newValues[targetType] = event.target.value ? +event.target.value : NaN;

		setFallbackValues(newValues);

		const newValue = +new Date(
			newValues.year,
			newValues.month,
			newValues.day >= 1 && newValues.day <= getMaxDay(newValues.year, newValues.month)
				? newValues.day
				// The day is out of the range of possible day values for the selected month, so the date should be invalid.
				: NaN
		);

		if (propValue === undefined) {
			// If this component's value is not controlled externally, update the Formik value.
			setFieldValue(Number.isNaN(newValue) ? undefined : newValue);
		}

		nativeInput.name = name;
		nativeInput.value = Number.isNaN(newValue) ? '' : newValue.toString();

		onChangeProp?.({
			...event,
			target: nativeInput
		});
	}, [year, month, day, name, propValue, setFieldValue, onChangeProp]);

	return (
		<>
			<input
				id={`${id}-day`}
				className="date-field-day"
				type="number"
				autoComplete={autoComplete ? `${autoComplete}-day` : undefined}
				required={required}
				placeholder="DD"
				min={1}
				max={getMaxDay(year, month)}
				size={4}
				value={Number.isNaN(day) ? '' : day}
				onChange={onChange}
			/>
			<select
				id={`${id}-month`}
				className="date-field-month"
				autoComplete={autoComplete ? `${autoComplete}-month` : undefined}
				required={required}
				value={Number.isNaN(month) ? '' : month}
				onChange={onChange}
			>
				<option value="" disabled hidden>Month</option>
				<option value={0}>January</option>
				<option value={1}>February</option>
				<option value={2}>March</option>
				<option value={3}>April</option>
				<option value={4}>May</option>
				<option value={5}>June</option>
				<option value={6}>July</option>
				<option value={7}>August</option>
				<option value={8}>September</option>
				<option value={9}>October</option>
				<option value={10}>November</option>
				<option value={11}>December</option>
			</select>
			<input
				id={`${id}-year`}
				className="date-field-year"
				type="number"
				autoComplete={autoComplete ? `${autoComplete}-year` : undefined}
				required={required}
				placeholder="YYYY"
				min={new Date(min).getFullYear()}
				max={new Date(max).getFullYear()}
				size={yearSize}
				value={Number.isNaN(year) ? '' : year}
				onChange={onChange}
			/>
		</>
	);
};

export default DateField;