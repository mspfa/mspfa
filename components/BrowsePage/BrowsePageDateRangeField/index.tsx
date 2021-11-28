import './styles.module.scss';
import Row from 'components/Row';
import type { ReactNode } from 'react';
import Label from 'components/Label';
import type { DateFieldProps } from 'components/DateField';
import DateField from 'components/DateField';

export type BrowsePageDateRangeFieldProps = Pick<DateFieldProps, 'min' | 'max'> & {
	/**
	 * The `name`s of the fields without `min` or `max` in front.
	 *
	 * For example, if you set `nameSuffix="FavCount"`, the field `name`s will be `minFavCount` and `maxFavCount`.
	 */
	nameSuffix: string,
	label: ReactNode,
	help?: ReactNode
};

/** A `Row` with a `Field` for a minimum number and another for a maximum number. */
const BrowsePageDateRangeField = ({
	nameSuffix,
	label,
	help,
	min,
	max
}: BrowsePageDateRangeFieldProps) => (
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
				name={`min${nameSuffix}`}
				min={min}
				max={max}
				withTime
			/>
		</div>
		<div className="browse-page-date-range-field-line spaced">
			{'at most '}
			<DateField
				name={`max${nameSuffix}`}
				min={min}
				max={max}
				withTime
			/>
		</div>
	</Row>
);

export default BrowsePageDateRangeField;