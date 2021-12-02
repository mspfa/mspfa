import { Field } from 'formik';
import type { FieldAttributes } from 'formik';
import toKebabCase from 'lib/client/toKebabCase';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import type { LabeledGridRowProps } from 'components/LabeledGrid/LabeledGridRow';
import { usePrefixedID } from 'lib/client/reactContexts/IDPrefix';

export type ExclusiveLabeledGridFieldProps = Pick<LabeledGridRowProps, 'label' | 'help'> & {
	/**
	 * The form `Field`'s `name` prop of this setting. Must be unique within the page.
	 *
	 * Automatically used to determine the `Field`'s `id`.
	 */
	name: string
};

export type LabeledGridFieldProps = FieldAttributes<unknown> & { id?: never } & ExclusiveLabeledGridFieldProps;

/** A `LabeledGridRow` containing a `Field`. Accepts any props which `Field` accepts. */
const LabeledGridField = ({
	label,
	name,
	help,
	...props
}: LabeledGridFieldProps) => {
	const id = usePrefixedID(`field-${toKebabCase(name)}`);

	return (
		<LabeledGridRow
			label={label}
			htmlFor={id}
			help={help}
		>
			<Field
				id={id}
				name={name}
				{...props}
			/>
		</LabeledGridRow>
	);
};

export default LabeledGridField;