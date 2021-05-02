import './styles.module.scss';
import { useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { useCallback, useState } from 'react';

// @client-only {
const nativeInput = document.createElement('input');
nativeInput.type = 'number';
// @client-only }

const yearSize = new Date().getFullYear().toString().length + 2;

/** Gets the maximum possible day of the month based on a full year number (e.g. 2001) and a month number (0 to 11). */
const getMaxDay = (year: number, month: number) => (
	isNaN(month)
		? 31
		: new Date(
			isNaN(year) ? new Date().getFullYear() : year,
			month + 1,
			0
		).getDate()
);

type ExclusiveDateFieldProps = {
	name: string,
	value?: number,
	yearProps?: Omit<InputHTMLAttributes<HTMLInputElement>, OmittedPropKeys>,
	monthProps?: Omit<SelectHTMLAttributes<HTMLSelectElement>, OmittedPropKeys>,
	dayProps?: Omit<InputHTMLAttributes<HTMLInputElement>, OmittedPropKeys>
};

type PickedPropKeys = 'id' | 'required' | 'min' | 'max' | 'onChange' | 'autoComplete';
type OmittedPropKeys = keyof ExclusiveDateFieldProps | PickedPropKeys | 'id' | 'type' | 'size' | 'placeholder';

export type DateFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, PickedPropKeys> & ExclusiveDateFieldProps;

const DateField = ({
	name,
	id = `field-${toKebabCase(name)}`,
	value: propValue,
	onChange: onChangeProp,
	required,
	min = 0,
	max = Date.now() + 1000 * 60 * 60 * 24 * 365 * 100,
	autoComplete,
	yearProps,
	monthProps,
	dayProps
}: DateFieldProps) => {
	const [{ value: fieldValue }, , { setValue: setFieldValue }] = useField<number | undefined>(name);

	const date = (
		typeof propValue === 'number'
			? new Date(propValue)
			: typeof fieldValue === 'number'
				? new Date(fieldValue)
				: undefined
	);

	let year = date ? date.getFullYear() : NaN;
	let month = date ? date.getMonth() : NaN;
	let day = date ? date.getDate() : NaN;

	const [fallbackValues, setFallbackValues] = useState({ year, month, day });
	console.log({ year, month, day }, fallbackValues);

	if (isNaN(year) || isNaN(month) || isNaN(day)) {
		year = fallbackValues.year;
		month = fallbackValues.month;
		day = fallbackValues.day;
	}

	const onChange = useCallback((
		event: ChangeEvent<HTMLInputElement & HTMLSelectElement>,
		newYear: number,
		newMonth: number,
		newDay: number
	) => {
		newDay = Math.min(getMaxDay(newYear, newMonth), newDay);

		const newValue = +new Date(newYear, newMonth, newDay);

		nativeInput.name = name;
		nativeInput.value = isNaN(newValue) ? '' : newValue.toString();

		if (propValue === undefined) {
			// If this component's value is not managed externally, update the Formik value.
			setFieldValue(isNaN(newValue) ? undefined : newValue);
		}

		onChangeProp?.({
			...event,
			target: nativeInput
		});

		setFallbackValues({
			year: newYear,
			month: newMonth,
			day: newDay
		});
	}, [name, propValue, setFieldValue, onChangeProp]);

	const onChangeYear = useCallback((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		onChange(
			event,
			event.target.value ? +event.target.value : NaN,
			month,
			day
		);
	}, [onChange, day, month]);

	const onChangeMonth = useCallback((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		onChange(
			event,
			year,
			event.target.value ? +event.target.value : NaN,
			day
		);
	}, [onChange, day, year]);

	const onChangeDay = useCallback((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		onChange(
			event,
			year,
			month,
			event.target.value ? +event.target.value : NaN
		);
	}, [onChange, month, year]);

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
				value={isNaN(day) ? '' : day}
				onChange={onChangeDay}
				{...dayProps}
			/>
			<select
				id={`${id}-month`}
				className="date-field-month"
				autoComplete={autoComplete ? `${autoComplete}-month` : undefined}
				required={required}
				value={isNaN(month) ? '' : month}
				onChange={onChangeMonth}
				{...monthProps}
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
				value={isNaN(year) ? '' : year}
				onChange={onChangeYear}
				{...yearProps}
			/>
		</>
	);
};

export default DateField;