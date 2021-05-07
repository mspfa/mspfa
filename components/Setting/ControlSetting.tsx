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
			label={label}
			readOnly
			placeholder="(None)"
			help={help}
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