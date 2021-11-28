import './styles.module.scss';
import Row from 'components/Row';
import type { InputHTMLAttributes, ReactNode } from 'react';
import Label from 'components/Label';
import { Field } from 'formik';

export type BrowsePageRangeFieldProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'min' | 'max'> & {
	/**
	 * The `name`s of the fields without `min` or `max` in front.
	 *
	 * For example, if you set `nameBase="FavCount"`, the field `name`s will be `minFavCount` and `maxFavCount`.
	 */
	nameBase: string,
	label: ReactNode,
	help?: ReactNode
};

/** A `Row` with a `Field` for a minimum number and another for a maximum number. */
const BrowsePageRangeField = ({
	nameBase,
	label,
	help,
	min = 0,
	// Enough `9`s to fit the `placeholder` of "Optional", but no more as to avoid making the inputs too wide.
	max = 99999999
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
				name={`min${nameBase}`}
				placeholder="Optional"
				min={min}
				max={max}
			/>
			{', at most '}
			<Field
				type="number"
				name={`max${nameBase}`}
				placeholder="Optional"
				min={min}
				max={max}
			/>
		</div>
	</Row>
);

export default BrowsePageRangeField;