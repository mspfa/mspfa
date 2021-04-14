import { Field } from 'formik';
import type { FieldAttributes } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import GridRow from 'components/Grid/GridRow';
import type { GridRowProps } from 'components/Grid/GridRow';

export type ExclusiveFieldGridRowProps = Pick<GridRowProps, 'label' | 'help'> & {
	/**
	 * The form `Field`'s `name` prop of this setting. Must be unique within the page.
	 *
	 * Automatically used to determine the `Field`'s `id`.
	 */
	name: string
};

export type FieldGridRowProps = FieldAttributes<unknown> & { id?: never } & ExclusiveFieldGridRowProps;

/** A `GridRow` containing a `Field`. Defaults to a checkbox. Accepts any props which `Field` accepts. */
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
		<GridRow
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
		</GridRow>
	);
};

export default FieldGridRow;