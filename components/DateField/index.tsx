import './styles.module.scss';
import { useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useCallback, useState } from 'react';

// TODO: Remove this after locales are implemented.
const monthNames = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

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

		// A value must be passed to this `Date` constructor so that the resulting date isn't dependent on the current time.
		const newDate = new Date(0);

		// Year must be set before day. Otherwise, for example, if the desired date is 29 February on a leap year, then when the day is set to 29, the date's current month will be February (because month must be set before day--see `setDate`'s comment), which may only have 28 days since the date's current year may not be a leap year, causing the date to wrap around to 1 March, which is the incorrect date.
		// If the date's current year is already set correctly when the day is set, it is impossible for the desired day to be too high for an incorrect year and cause wrapping.
		newDate.setFullYear(newValues.year);

		// Day must be set to 1 before month is set. Otherwise, for example, if the desired date is 30 April, then when the month is set to April (which only has 30 days), the date's current day may be 31, causing the date to wrap around to 1 May, which is the incorrect date.
		// If the date's current day is already 1 when the month is set, it is impossible for an incorrect day to be too high for the desired month and cause wrapping.
		newDate.setDate(1);

		newDate.setMonth(newValues.month);

		// Day must be set after month. Otherwise, for example, if the desired day is 31, then when the day is set to 31, the date's current month may not have 31 days, causing the date to wrap around to day 1 of the next month, which is the incorrect date.
		// If the date's current month is already set correctly when the day is set, it is impossible for the desired day to be too high for an incorrect month and cause wrapping.
		newDate.setDate(
			newValues.day >= 1 && newValues.day <= getMaxDay(newValues.year, newValues.month)
				? newValues.day
				// The day is out of the range of possible day values for the selected month, so the date should be invalid rather than wrapping around to preceding or following months.
				: NaN
		);

		// Holy shit. That took ages to get right.

		const newValue = +newDate;

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

	const minYear = new Date(min).getFullYear();
	const maxYear = new Date(max).getFullYear();

	const minMonth = (
		year === minYear
			? new Date(min).getMonth()
			: 0
	);
	const maxMonth = (
		year === maxYear
			? new Date(max).getMonth()
			: 11
	);

	const minDay = (
		year === minYear && month === minMonth
			? new Date(min).getDate()
			: 1
	);
	const maxDay = (
		year === maxYear && month === maxMonth
			? new Date(max).getDate()
			: getMaxDay(year, month)
	);

	return (
		<>
			<input
				id={`${id}-day`}
				className="date-field-day"
				type="number"
				autoComplete={autoComplete ? `${autoComplete}-day` : undefined}
				required={required}
				placeholder="DD"
				min={minDay}
				max={maxDay}
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
				{monthNames.map((monthName, i) => {
					const disabled = i < minMonth || i > maxMonth;

					return (
						<option
							key={i}
							value={disabled ? '' : i}
							disabled={disabled}
						>
							{monthName}
						</option>
					);
				})}
			</select>
			<input
				id={`${id}-year`}
				className="date-field-year"
				type="number"
				autoComplete={autoComplete ? `${autoComplete}-year` : undefined}
				required={required}
				placeholder="YYYY"
				min={minYear}
				max={maxYear}
				size={yearSize}
				value={Number.isNaN(year) ? '' : year}
				onChange={onChange}
			/>
		</>
	);
};

export default DateField;