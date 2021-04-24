import { useFormikContext } from 'formik';
import FieldGridRow from 'components/Grid/FieldGridRow';
import type { ExclusiveFieldGridRowProps } from 'components/Grid/FieldGridRow';
import type { KeyboardEvent } from 'react';
import { useCallback } from 'react';

export type ControlSettingProps = ExclusiveFieldGridRowProps;

const ControlSetting = ({
	label,
	name,
	help
}: ControlSettingProps) => {
	const { setFieldValue } = useFormikContext();

	return (
		<FieldGridRow
			name={name}
			label={label}
			help={help}
			type="text"
			placeholder="(None)"
			readOnly
			onKeyDown={
				useCallback((event: KeyboardEvent<HTMLInputElement> & { target: HTMLInputElement }) => {
					if (!event.target.disabled) {
						event.preventDefault();

						setFieldValue(
							name,
							event.code === 'Escape'
								? ''
								: event.code
						);
					}
				}, [name, setFieldValue])
			}
		/>
	);
};

export default ControlSetting;