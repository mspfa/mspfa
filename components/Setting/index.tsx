import { Field } from 'formik';
import type { FieldAttributes } from 'formik';
import type { ReactNode } from 'react';
import HelpButton from 'components/Button/HelpButton';
import { toClassName } from 'modules/client/forms';
import './styles.module.scss';

export type ExclusiveSettingProps = {
	label: ReactNode,
	/** The form `Field`'s `name` prop of this setting. */
	name: string,
	/** Adds a help button next to the setting's label which can be clicked to open a dialog with this value as its content. */
	help?: ReactNode
};

export type SettingProps = Omit<FieldAttributes<unknown>, 'id'> & ExclusiveSettingProps;

const Setting = ({
	label,
	name,
	type = 'checkbox',
	help,
	...props
}: SettingProps) => {
	// Determine the form `Field`'s `id` based on its `name`, converting from camelCase to kebab-case.
	const id = `setting-${toClassName(name)}`;

	return (
		<>
			<div className="setting-label">
				<label htmlFor={id}>
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
					id={id}
					name={name}
					type={props.as ? undefined : type}
					{...props}
				/>
			</div>
		</>
	);
};

export default Setting;