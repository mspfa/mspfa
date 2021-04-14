import { Field, FormikContext } from 'formik';
import type { ExclusiveSettingProps } from 'components/Setting';
import { toKebabCase } from 'modules/client/utilities';
import type { FieldAttributes } from 'formik';
import type { KeyboardEvent } from 'react';
import { useCallback, useContext } from 'react';
import HelpButton from 'components/Button/HelpButton';

export type ControlSettingProps = ExclusiveSettingProps & FieldAttributes<unknown>;

const ControlSetting = ({
	label,
	name,
	help,
	...props
}: ControlSettingProps) => {
	const idKebab = `setting-${toKebabCase(name)}`;

	const { setFieldValue } = useContext(FormikContext);

	return (
		<>
			<div className="setting-label">
				<label htmlFor={idKebab}>
					{label}
				</label>
				{help && (
					<HelpButton className="spaced">
						{label}:<br />
						<br />
						{help}
					</HelpButton>
				)}
			</div>
			<div className="setting-input">
				<Field
					id={idKebab}
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