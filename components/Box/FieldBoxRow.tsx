import { Field } from 'formik';
import type { FieldAttributes } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import type { LabeledBoxRowProps } from 'components/Box/LabeledBoxRow';
import { usePrefixedID } from 'modules/client/IDPrefix';

export type ExclusiveFieldBoxRowProps = Pick<LabeledBoxRowProps, 'label' | 'help'> & {
	/**
	 * The form `Field`'s `name` prop of this setting. Must be unique within the page.
	 *
	 * Automatically used to determine the `Field`'s `id`.
	 */
	name: string
};

export type FieldBoxRowProps = FieldAttributes<unknown> & { id?: never } & ExclusiveFieldBoxRowProps;

/** A `LabeledBoxRow` containing a `Field`. Accepts any props which `Field` accepts. */
const FieldBoxRow = ({
	label,
	name,
	type,
	help,
	...props
}: FieldBoxRowProps) => {
	const id = usePrefixedID(`field-${toKebabCase(name)}`);

	return (
		<LabeledBoxRow
			label={label}
			htmlFor={id}
			help={help}
		>
			<Field
				type={props.as ? undefined : type}
				id={id}
				name={name}
				{...props}
			/>
		</LabeledBoxRow>
	);
};

export default FieldBoxRow;