import { useFormikContext } from 'formik';
import FieldBoxRow from 'components/Box/FieldBoxRow';
import type { ExclusiveFieldBoxRowProps } from 'components/Box/FieldBoxRow';
import type { KeyboardEvent } from 'react';
import { useCallback } from 'react';

export type ControlSettingProps = ExclusiveFieldBoxRowProps;

const ControlSetting = ({
	label,
	name,
	help
}: ControlSettingProps) => {
	const { setFieldValue } = useFormikContext();

	return (
		<FieldBoxRow
			name={name}
			help={help}
			placeholder="(None)"
			readOnly
			label={label}
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