import { Field } from 'formik';
import type { FieldAttributes } from 'formik';
import './styles.module.scss';

export type ExclusiveSettingProps = {
	label: string,
	/** The form `Field`'s `name` prop of this setting. */
	name: string
};

export type SettingProps = Omit<FieldAttributes<unknown>, 'id'> & ExclusiveSettingProps;

const Setting = ({
	label,
	name,
	type = 'checkbox',
	...props
}: SettingProps) => {
	// Determine the form `Field`'s `id` based on its `name`, converting from camelCase to kebab-case.
	const id = `setting-${name.replace(/([A-Z])/g, '-$1').replace(/\W/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;

	return (
		<>
			<label className="setting-label" htmlFor={id}>
				{label}
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