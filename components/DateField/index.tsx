import './styles.module.scss';
import { useField } from 'formik';
import toKebabCase from 'lib/client/toKebabCase';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { monthNames, twoDigits } from 'lib/client/dates';
import { usePrefixedID } from 'lib/client/reactContexts/IDPrefix';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import type { DateNumber, integer } from 'lib/types';

// @client-only {
const nativeInput = document.createElement('input');
nativeInput.type = 'number';
// @client-only }

/** Gets the maximum possible day of the month based on a full year number (e.g. 2001) and a month number (0 to 11). */
const getMaxDay = (year: integer, month: integer) => {
	const lastDayOfTheMonth = new Date(0);
	lastDayOfTheMonth.setFullYear(
		// Year 2000 is used as a fallback here because 2000 is a leap year, so if the year is invalid, it will allow up to 29 February by default instead of 28.
		Number.isNaN(year) ? 2000 : year,
		// The following month.
		month + 1,
		// Because days start counting at 1, setting the date to day 0 of the above following month causes the date to wrap around to the last day of this month.
		0
	);

	// Get the last day of the month as described in the previous comment.
	const maxDay = lastDayOfTheMonth.getDate();

	return Number.isNaN(maxDay) ? 31 : maxDay;
};

export type DateFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required' | 'min' | 'max' | 'onChange' | 'autoComplete' | 'disabled'> & {
	name: string,
	/**
	 * The controlled value of the date field.
	 *
	 * If this is undefined, the value will be controlled by Formik as a number.
	 *
	 * If this is a string, it will automatically be converted to a number.
	 *
	 * If this is `NaN`, the value will be controlled internally and without Formik.
	 */
	value?: DateNumber | string,
	withTime?: boolean,
	/**
	 * The default value of the year input.
	 *
	 * ⚠️ There is no validation that this is within the bounds of `min` and `max`.
	 */
	defaultYear?: integer,
	/**
	 * The default value of the month input.
	 *
	 * ⚠️ There is no validation that this is within the bounds of `min` and `max`.
	 */
	defaultMonth?: integer,
	/**
	 * The default value of the day input.
	 *
	 * ⚠️ There is no validation that this is within the bounds of `min` and `max`.
	 */
	defaultDay?: integer,
	/**
	 * The default value of the hour input.
	 *
	 * ⚠️ There is no validation that this is within the bounds of `min` and `max`.
	 */
	defaultHour?: integer,
	/**
	 * The default value of the minute input.
	 *
	 * ⚠️ There is no validation that this is within the bounds of `min` and `max`.
	 */
	defaultMinute?: integer
};

const DateField = ({
	name,
	id,
	value: valueProp,
	onChange: onChangeProp,
	min = 0,
	max = Date.now() + 1000 * 60 * 60 * 24 * 365 * 100,
	autoComplete,
	withTime,
	defaultYear = NaN,
	defaultMonth = NaN,
	defaultDay = NaN,
	defaultHour = NaN,
	defaultMinute = NaN,
	...props
}: DateFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const [, { value: fieldValue }, { setValue: setFieldValue }] = useField<DateNumber | undefined>(name);

	const date = (
		valueProp === undefined
			? typeof fieldValue === 'number'
				? new Date(fieldValue)
				: undefined
			: new Date(
				typeof valueProp === 'string'
					? valueProp
						? +valueProp
						: NaN
					: valueProp
			)
	);

	let year = date ? date.getFullYear() : NaN;
	let month = date ? date.getMonth() : NaN;
	let day = date ? date.getDate() : NaN;
	let hour = date ? date.getHours() : NaN;
	let minute = date ? date.getMinutes() : NaN;

	const [inputValues, setInputValues] = useState({
		year: Number.isNaN(year) ? defaultYear : year,
		month: Number.isNaN(month) ? defaultMonth : month,
		day: Number.isNaN(day) ? defaultDay : day,
		hour: Number.isNaN(hour) ? defaultHour : hour,
		minute: Number.isNaN(minute) ? defaultMinute : minute
	} as const);

	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute)) {
		({ year, month, day, hour, minute } = inputValues);
	}

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

	const minHour = (
		year === minYear && month === minMonth && day === minDay
			? new Date(min).getHours()
			: 0
	);
	const maxHour = (
		year === maxYear && month === maxMonth && day === maxDay
			? new Date(max).getHours()
			: 23
	);

	const minMinute = (
		year === minYear && month === minMonth && day === minDay && hour === minHour
			? new Date(min).getMinutes()
			: 0
	);
	const maxMinute = (
		year === maxYear && month === maxMonth && day === maxDay && hour === maxHour
			? new Date(max).getMinutes()
			: 59
	);

	const onChange = useFunction((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		const targetType = event.target.id.slice(event.target.id.lastIndexOf('-') + 1) as 'year' | 'month' | 'day' | 'hour' | 'minute';

		const newValues = { year, month, day, hour, minute };
		newValues[targetType] = event.target.value ? +event.target.value : NaN;

		const newMinMonth = (
			newValues.year === minYear
				? new Date(min).getMonth()
				: 0
		);
		const newMaxMonth = (
			newValues.year === maxYear
				? new Date(max).getMonth()
				: 11
		);

		// This is necessary because the form is not invalidated by a `disabled` month `option` element being selected.
		if (newValues.month < newMinMonth) {
			newValues.month = newMinMonth;
		} else if (newValues.month > newMaxMonth) {
			newValues.month = newMaxMonth;
		}

		setInputValues(newValues);

		// A value must be passed to this `Date` constructor so that the resulting date isn't dependent on the current time.
		const newDate = new Date(0);
		newDate.setFullYear(
			newValues.year,
			newValues.month,
			newValues.day >= 1 && newValues.day <= getMaxDay(newValues.year, newValues.month)
				? newValues.day
				// The day is out of the range of possible day values for the selected month, so the date should be invalid rather than wrapping around to preceding or following months.
				: NaN
		);

		if (withTime) {
			newDate.setHours(
				newValues.hour >= 0 && newValues.hour < 24
					? newValues.hour
					: NaN,
				newValues.minute >= 0 && newValues.minute < 60
					? newValues.minute
					: NaN
			);
		}

		const newValue = +newDate;

		if (valueProp === undefined) {
			// If this component's value is not controlled externally, update the Formik value.
			setFieldValue(Number.isNaN(newValue) ? undefined : newValue);
		}

		nativeInput.name = name;
		nativeInput.value = Number.isNaN(newValue) ? '' : newValue.toString();

		onChangeProp?.({
			...event,
			target: nativeInput
		});
	});

	const [renderYearOptions, setRenderYearOptions] = useState(false);

	useIsomorphicLayoutEffect(() => {
		setRenderYearOptions(true);
	}, []);

	return (
		<>
			<select
				id={`${id}-year`}
				className="date-field-year spaced"
				autoComplete={autoComplete ? `${autoComplete}-year` : undefined}
				value={!renderYearOptions || Number.isNaN(year) ? '' : year}
				onChange={onChange}
				{...props}
			>
				<option value="" disabled hidden>YYYY</option>
				{renderYearOptions && (
					// The `option`s are only rendered client-side because of how large they can be as an HTML string.
					Array.from({ length: maxYear - minYear + 1 }).map((uselessValue, i) => {
						const value = maxYear - i;

						return (
							<option key={value} value={value}>
								{value}
							</option>
						);
					})
				)}
			</select>
			<select
				id={`${id}-month`}
				className="date-field-month spaced"
				autoComplete={autoComplete ? `${autoComplete}-month` : undefined}
				value={Number.isNaN(month) ? '' : month}
				onChange={onChange}
				{...props}
			>
				<option value="" disabled hidden>Month</option>
				{monthNames.map((monthName, i) => (
					<option
						key={i}
						value={i}
						disabled={i < minMonth || i > maxMonth}
					>
						{monthName}
					</option>
				))}
			</select>
			<input
				type="number"
				id={`${id}-day`}
				className="date-field-day spaced"
				autoComplete={autoComplete ? `${autoComplete}-day` : undefined}
				placeholder="DD"
				min={minDay}
				max={maxDay}
				value={Number.isNaN(day) ? '' : twoDigits(day)}
				onChange={onChange}
				{...props}
			/>
			{withTime && (
				<>
					{' at '}
					<input
						type="number"
						id={`${id}-hour`}
						className="date-field-hour"
						autoComplete={autoComplete ? `${autoComplete}-hour` : undefined}
						placeholder="hh"
						min={minHour}
						max={maxHour}
						value={Number.isNaN(hour) ? '' : twoDigits(hour)}
						onChange={onChange}
						{...props}
					/>
					:
					<input
						type="number"
						id={`${id}-minute`}
						className="date-field-minute"
						autoComplete={autoComplete ? `${autoComplete}-minute` : undefined}
						placeholder="mm"
						min={minMinute}
						max={maxMinute}
						value={Number.isNaN(minute) ? '' : twoDigits(minute)}
						onChange={onChange}
						{...props}
					/>
				</>
			)}
		</>
	);
};

export default DateField;