import './styles.module.scss';
import Row from 'components/Row';
import type { ReactNode } from 'react';
import Label from 'components/Label';
import type { DateFieldProps } from 'components/DateField';
import DateField from 'components/DateField';
import { Field } from 'formik';
import toKebabCase from 'lib/client/toKebabCase';

const minQueryDate = new Date(0);
minQueryDate.setFullYear(2010, 0, 1);
minQueryDate.setHours(0, 0, 0, 0);

/** The `DateNumber` at the beginning of the year that MSPFA was created (in the user's time zone). */
export const DEFAULT_MIN_DATE = +minQueryDate;

export type BrowsePageDateRangeFieldProps = Pick<DateFieldProps, 'min' | 'max'> & {
	/**
	 * The `name`s of the fields without `min`, `max`, or `Relative`.
	 *
	 * For example, if you set `nameBase="FavCount"`, the field `name`s will be `minFavCount`, `minFavCountRelative`, `maxFavCount`, and `maxFavCountRelative`.
	 */
	nameBase: string,
	label: ReactNode,
	help?: ReactNode
};

/** A `Row` with a `Field` for a minimum number and another for a maximum number. */
const BrowsePageDateRangeField = ({
	nameBase,
	label,
	help,
	min = DEFAULT_MIN_DATE,
	max = Date.now()
}: BrowsePageDateRangeFieldProps) => {
	const idBase = toKebabCase(nameBase);

	return (
		<Row className="browse-page-date-range-field-container">
			<Label
				className="spaced"
				block
				help={help}
			>
				{label}
			</Label>
			<div className="browse-page-date-range-field-line spaced">
				{'at least '}
				<DateField
					name={`min${nameBase}`}
					min={min}
					max={max}
					withTime
				/>
				<span className="browse-page-checkbox-field-container">
					<Field
						type="checkbox"
						id={`field-min-${idBase}-relative`}
						name={`min${nameBase}Relative`}
						className="spaced"
					/>
					<label
						className="spaced"
						htmlFor={`field-min-${idBase}-relative`}
					>
						Relative
					</label>
				</span>
			</div>
			<div className="browse-page-date-range-field-line spaced">
				{'at most '}
				<DateField
					name={`max${nameBase}`}
					min={min}
					max={max}
					withTime
				/>
				<span className="browse-page-checkbox-field-container">
					<Field
						type="checkbox"
						id={`field-max-${idBase}-relative`}
						name={`max${nameBase}Relative`}
						className="spaced"
					/>
					<label
						className="spaced"
						htmlFor={`field-max-${idBase}-relative`}
					>
						Relative
					</label>
				</span>
			</div>
		</Row>
	);
};

export default BrowsePageDateRangeField;