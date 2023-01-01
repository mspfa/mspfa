import './styles.module.scss';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useField } from 'formik';
import { useEffect } from 'react';

export type CaptchaProps = {
	/** The name of the form value which should have the captcha token. */
	name: string
};

const Captcha = ({ name }: CaptchaProps) => {
	const [, { initialValue }, { setValue }] = useField<string>(name);

	const resetValue = useFunction(() => {
		setValue(initialValue || '');
	});

	useEffect(() => resetValue, [resetValue]);

	return (
		<HCaptcha
			id="captcha"
			sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
			onVerify={
				useFunction((token: string) => {
					setValue(token);
				})
			}
			onExpire={resetValue}
		/>
	);
};

export default Captcha;
