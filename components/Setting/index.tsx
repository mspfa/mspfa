import { Field } from 'formik';
import type { FieldAttributes } from 'formik';
import type { ReactNode } from 'react';
import HelpButton from 'components/Button/HelpButton';
import './styles.module.scss';

export type ExclusiveSettingProps = {
	label: ReactNode,
	/** The form `Field`'s `name` prop of this setting. */
	name: string,
	/** Adds a help button next to the setting's label which can be clicked to open a dialog with this value as its content. */
	info?: ReactNode
};

export type SettingProps = Omit<FieldAttributes<unknown>, 'id'> & ExclusiveSettingProps;

const Setting = ({
	label,
	name,
	type = 'checkbox',
	info,
	...props
}: SettingProps) => {
	// Determine the form `Field`'s `id` based on its `name`, converting from camelCase to kebab-case.
	const id = `setting-${name.replace(/([A-Z])/g, '-$1').replace(/\W/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;

	return (
		<>
			<label className="setting-label" htmlFor={id}>
				{label}
				{info && (
					<HelpButton className="spaced">
						{label}:<br />
						<br />
						{info}
					</HelpButton>
				)}
			</label>
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