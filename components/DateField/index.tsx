import './styles.module.scss';
import { useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import type { ChangeEvent, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { useCallback } from 'react';

// @client-only {
const nativeInput = document.createElement('input');
nativeInput.type = 'number';
// @client-only }

const yearSize = new Date().getFullYear().toString().length + 2;

type ExclusiveDateFieldProps = {
	name: string,
	value?: number,
	dayProps?: Omit<InputHTMLAttributes<HTMLInputElement>, OmittedPropKeys>,
	monthProps?: Omit<SelectHTMLAttributes<HTMLSelectElement>, OmittedPropKeys>,
	yearProps?: Omit<InputHTMLAttributes<HTMLInputElement>, OmittedPropKeys>
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
	dayProps,
	monthProps,
	yearProps
}: DateFieldProps) => {
	const [{ value: fieldValue }, , { setValue: setFieldValue }] = useField<number | undefined>(name);

	const date = (
		typeof propValue === 'number'
			? new Date(propValue)
			: typeof fieldValue === 'number'
				? new Date(fieldValue)
				: undefined
	);

	const day = date ? date.getDate() : NaN;
	const month = date ? date.getMonth() : NaN;
	const year = date ? date.getFullYear() : NaN;

	const onChange = useCallback((
		event: ChangeEvent<HTMLInputElement & HTMLSelectElement>,
		newValue: number
	) => {
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
	}, [name, propValue, setFieldValue, onChangeProp]);

	const onChangeDay = useCallback((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		onChange(
			event,
			+new Date(year, month, +event.target.value)
		);
	}, [onChange, month, year]);

	const onChangeMonth = useCallback((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		onChange(
			event,
			+new Date(year, +event.target.value, day)
		);
	}, [onChange, day, year]);

	const onChangeYear = useCallback((event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => {
		onChange(
			event,
			+new Date(+event.target.value, month, day)
		);
	}, [onChange, day, month]);

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
				max={(isNaN(year) || isNaN(month)
					? 31
					: new Date(year, month, 0).getDate()
				)}
				size={4}
				value={day}
				onChange={onChangeDay}
				{...dayProps}
			/>
			<select
				id={`${id}-month`}
				className="date-field-month"
				autoComplete={autoComplete ? `${autoComplete}-month` : undefined}
				required={required}
				value={month}
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
				value={year}
				onChange={onChangeYear}
				{...yearProps}
			/>
		</>
	);
};

export default DateField;