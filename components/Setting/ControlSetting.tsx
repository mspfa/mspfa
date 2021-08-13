import { Field, useFormikContext } from 'formik';
import type { ExclusiveFieldBoxRowProps } from 'components/Box/FieldBoxRow';
import type { KeyboardEvent } from 'react';
import { useState, useRef } from 'react';
import useFunction from 'lib/client/useFunction';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import { usePrefixedID } from 'lib/client/IDPrefix';
import toKebabCase from 'lib/client/toKebabCase';
import EditButton from 'components/Button/EditButton';
import RemoveButton from 'components/Button/RemoveButton';

export type ControlSettingProps = ExclusiveFieldBoxRowProps;

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
		<LabeledBoxRow
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
		</LabeledBoxRow>
	);
};

export default ControlSetting;