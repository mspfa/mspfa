import { Field, FormikContext } from 'formik';
import type { ExclusiveSettingProps } from 'components/Setting';
import type { FieldAttributes } from 'formik';
import type { KeyboardEvent } from 'react';
import { useCallback, useContext } from 'react';

export type ControlSettingProps = ExclusiveSettingProps & FieldAttributes<unknown>;

const ControlSetting = ({
	label,
	name,
	...props
}: ControlSettingProps) => {
	const { setFieldValue } = useContext(FormikContext);

	return (
		<>
			<label className="setting-label">
				{label}
			</label>
			<div className="setting-input">
				<Field
					name={name}
					placeholder="(None)"
					{...props}
					readOnly
					onKeyDown={
						useCallback((evt: KeyboardEvent<HTMLInputElement> & { target: HTMLInputElement }) => {
							if (!evt.target.disabled) {
								evt.preventDefault();

								if (evt.code === 'Escape') {
									setFieldValue(name, '');
								} else {
									setFieldValue(name, evt.code);
								}
							}
						}, [name, setFieldValue])
					}
				/>
			</div>
		</>
	);
};

export default ControlSetting;