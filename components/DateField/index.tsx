import { useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useCallback, useState } from 'react';
import { monthNames } from 'modules/client/dates';
import { usePrefixedID } from 'modules/client/IDPrefix';
import { useIsomorphicLayoutEffect } from 'react-use';

// @client-only {
const nativeInput = document.createElement('input');
nativeInput.type = 'number';
// @client-only }

/** Gets the maximum possible day of the month based on a full year number (e.g. 2001) and a month number (0 to 11). */
const getMaxDay = (year: number, month: number) => {
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
	 * If this is undefined, the value will be controlled by Formik.
	 *
	 * If this is a string, it will automatically be converted to a number.
	 *
	 * If this is `NaN`, the value will be controlled internally and without Formik.
	 */
	value?: number | string
};

const DateField = ({
	name,
	id,
	value: valueProp,
	onChange: onChangeProp,
	min = 0,
	max = Date.now() + 1000 * 60 * 60 * 24 * 365 * 100,
	autoComplete,
	...props
}: DateFieldProps) => {
	const idPrefix = usePrefixedID();

	if (id === undefined) {
		id = `${idPrefix}field-${toKebabCase(name)}`;
	}

	const [, { value: fieldValue }, { setValue: setFieldValue }] = useField<number | undefined>(name);

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

	const [inputValues, setInputValues] = useState({ year, month, day } as const);

	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
		({ year, month, day } = inputValues);
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

	const onChange = useCallback((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		const targetType = event.target.id.slice(event.target.id.lastIndexOf('-') + 1) as 'year' | 'month' | 'day';

		const newValues = { year, month, day };
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
		const newValue = new Date(0).setFullYear(
			newValues.year,
			newValues.month,
			newValues.day >= 1 && newValues.day <= getMaxDay(newValues.year, newValues.month)
				? newValues.day
				// The day is out of the range of possible day values for the selected month, so the date should be invalid rather than wrapping around to preceding or following months.
				: NaN
		);

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

		// This ESLint comment is necessary because the rule incorrectly thinks `minYear` and `maxYear` should be dependencies here, despite that they depend on `min` and `max` which are already dependencies.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [year, month, day, name, valueProp, setFieldValue, onChangeProp, min, max]);

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
				size={4}
				value={Number.isNaN(day) ? '' : day}
				onChange={onChange}
				{...props}
			/>
		</>
	);
};

export default DateField;