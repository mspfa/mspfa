import { Field } from 'formik';
import type { FieldAttributes } from 'formik';
import './styles.module.scss';

export type SettingProps = Omit<FieldAttributes<any>, 'id'> & {
	label: string,
	/** The form `Field`'s `name` prop of this setting. */
	name: string
};

const Setting = ({
	label,
	name,
	type = 'checkbox',
	...props
}: SettingProps) => {
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
					type={type}
					{...props}
				/>
			</div>
		</>
	);
};

export default Setting;