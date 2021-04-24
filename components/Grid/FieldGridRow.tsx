import { Field } from 'formik';
import type { FieldAttributes } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import LabeledGridRow from 'components/Grid/LabeledGridRow';
import type { LabeledGridRowProps } from 'components/Grid/LabeledGridRow';

export type ExclusiveFieldGridRowProps = Pick<LabeledGridRowProps, 'label' | 'help'> & {
	/**
	 * The form `Field`'s `name` prop of this setting. Must be unique within the page.
	 *
	 * Automatically used to determine the `Field`'s `id`.
	 */
	name: string
};

export type FieldGridRowProps = FieldAttributes<unknown> & { id?: never } & ExclusiveFieldGridRowProps;

/** A `LabeledGridRow` containing a `Field`. Defaults to a checkbox. Accepts any props which `Field` accepts. */
const FieldGridRow = ({
	label,
	name,
	type = 'checkbox',
	help,
	...props
}: FieldGridRowProps) => {
	// Determine the form `Field`'s `id` based on its `name`, converting from camelCase to kebab-case.
	const fieldID = `field-${toKebabCase(name)}`;

	return (
		<LabeledGridRow
			label={label}
			htmlFor={fieldID}
			help={help}
		>
			<Field
				id={fieldID}
				name={name}
				type={props.as ? undefined : type}
				{...props}
			/>
		</LabeledGridRow>
	);
};

export default FieldGridRow;