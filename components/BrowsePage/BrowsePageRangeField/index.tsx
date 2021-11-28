import Row from 'components/Row';
import type { InputHTMLAttributes, ReactNode } from 'react';
import Label from 'components/Label';
import { Field } from 'formik';

export type BrowsePageRangeFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'min' | 'max'> & {
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
const BrowsePageRangeField = ({
	nameSuffix,
	label,
	help,
	min = 0,
	max
}: BrowsePageRangeFieldProps) => (
	<Row className="browse-page-range-field-container">
		<Label
			className="spaced"
			block
			help={help}
		>
			{label}
		</Label>
		<div className="browse-page-range-field-line spaced">
			{'at least '}
			<Field
				type="number"
				name={`min${nameSuffix}`}
				placeholder="Optional"
				min={min}
				max={max}
			/>
			{', at most '}
			<Field
				type="number"
				name={`max${nameSuffix}`}
				placeholder="Optional"
				min={min}
				max={max}
			/>
		</div>
	</Row>
);

export default BrowsePageRangeField;