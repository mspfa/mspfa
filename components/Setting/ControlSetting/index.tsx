import { Field, useFormikContext } from 'formik';
import type { ExclusiveLabeledGridFieldProps } from 'components/LabeledGrid/LabeledGridField';
import type { KeyboardEvent } from 'react';
import { useState, useRef } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import { usePrefixedID } from 'lib/client/reactContexts/IDPrefix';
import toKebabCase from 'lib/client/toKebabCase';
import EditButton from 'components/Button/EditButton';
import RemoveButton from 'components/Button/RemoveButton';

export type ControlSettingProps = ExclusiveLabeledGridFieldProps;

/** A `LabeledGridRow` containing a `Field` for a control setting. */
const ControlSetting = ({ label, name, help }: ControlSettingProps) => {
	const { setFieldValue } = useFormikContext();

	const fieldRef = useRef<HTMLInputElement>(null);

	const id = usePrefixedID(`field-${toKebabCase(name)}`);

	const [editing, setEditing] = useState(false);

	const toggleEditing = useFunction(() => {
		setEditing(!editing);

		if (!editing) {
			setTimeout(() => {
				fieldRef.current?.focus();
			});
		}
	});

	return (
		<LabeledGridRow
			label={label}
			htmlFor={id}
			help={help}
		>
			<Field
				id={id}
				name={name}
				className="spaced"
				readOnly
				placeholder="(None)"
				disabled={!editing}
				onKeyDown={
					useFunction((event: KeyboardEvent<HTMLInputElement> & { target: HTMLInputElement }) => {
						if (!event.target.disabled) {
							event.preventDefault();

							if (event.code !== 'Escape') {
								setFieldValue(name, event.code);
							}

							setEditing(false);
						}
					})
				}
				innerRef={fieldRef}
			/>
			{editing ? (
				<RemoveButton
					className="spaced"
					title="Cancel"
					onClick={toggleEditing}
				/>
			) : (
				<EditButton
					className="spaced"
					title="Edit Control"
					onClick={toggleEditing}
				/>
			)}
		</LabeledGridRow>
	);
};

export default ControlSetting;