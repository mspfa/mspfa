import './styles.module.scss';
import { setSignInPage, resolveExternalSignIn } from 'modules/client/signIn';
import Link from 'components/Link';
import createUpdater from 'react-component-updater';
import type { ChangeEvent } from 'react';
import Captcha from 'components/SignIn/Captcha';
import LabeledBoxRow from 'components/Box/LabeledBoxRow';
import { toPattern } from 'modules/client/utilities';
import LabeledDialogBox from 'components/Box/LabeledDialogBox';
import ForgotPassword from 'components/ForgotPassword';
import AuthButton from 'components/Button/AuthButton';
import BirthdateField from 'components/DateField/BirthdateField';

const startSigningUp = () => {
	setSignInPage(1);
};

const [useSignInValuesUpdater, updateSignInValues] = createUpdater();

/** The initial values of the sign-in dialog's form. */
export const initialSignInValues = {
	email: '',
	password: '',
	confirmPassword: '',
	name: '',
	termsAgreed: false,
	birthdate: '',
	captchaToken: ''
};

export let signInValues = { ...initialSignInValues };

export const resetSignInValues = () => {
	signInValues = { ...initialSignInValues };
	updateSignInValues();
};

const onChange = (
	event: ChangeEvent<(
		HTMLInputElement
		& HTMLSelectElement
		& { name: keyof typeof signInValues }
	)>
) => {
	if (event.target.type === 'checkbox') {
		(signInValues[event.target.name] as boolean) = event.target.checked;
	} else {
		(signInValues[event.target.name] as string) = event.target.value;
	}
	updateSignInValues();
};

export type SignInProps = {
	/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
	page: number
};

const SignIn = ({ page }: SignInProps) => {
	useSignInValuesUpdater();

	return (
		<div id="sign-in-content">
			{page !== 2 && (
				<>
					<div className="translucent-text">
						{page ? 'Sign up with' : 'Sign in with'}
					</div>
					<div id="sign-in-methods-external">
						<AuthButton type="google" onResolve={resolveExternalSignIn} />
						<AuthButton type="discord" onResolve={resolveExternalSignIn} />
					</div>
					<div id="sign-in-divider" className="translucent-text">or</div>
				</>
			)}
			<LabeledDialogBox>
				{page === 2 ? (
					<>
						<LabeledBoxRow htmlFor="sign-in-name" label="Username">
							<input
								id="sign-in-name"
								name="name"
								autoComplete="username"
								required
								minLength={1}
								maxLength={32}
								autoFocus={!signInValues.name}
								value={signInValues.name}
								onChange={onChange}
							/>
						</LabeledBoxRow>
						<LabeledBoxRow htmlFor="sign-in-birthdate-day" label="Birthdate">
							<BirthdateField
								id="sign-in-birthdate"
								required
								value={signInValues.birthdate}
								onChange={onChange}
							/>
						</LabeledBoxRow>
					</>
				) : (
					<>
						<LabeledBoxRow htmlFor="sign-in-email" label="Email">
							<input
								key={page} // This is necessary to re-render this element when `page` changes, or else `autoFocus` will not work correctly.
								type="email"
								id="sign-in-email"
								name="email"
								autoComplete="email"
								required
								maxLength={254}
								autoFocus={!signInValues.email}
								value={signInValues.email}
								onChange={onChange}
							/>
						</LabeledBoxRow>
						<LabeledBoxRow htmlFor="sign-in-password" label="Password">
							<input
								type="password"
								id="sign-in-password"
								name="password"
								autoComplete={page ? 'new-password' : 'current-password'}
								required
								minLength={8}
								value={signInValues.password}
								onChange={onChange}
							/>
						</LabeledBoxRow>
						{page === 0 ? (
							<ForgotPassword />
						) : (
							<LabeledBoxRow htmlFor="sign-in-confirm-password" label="Confirm">
								<input
									type="password"
									id="sign-in-confirm-password"
									name="confirmPassword"
									autoComplete="new-password"
									required
									placeholder="Re-Type Password"
									pattern={toPattern(signInValues.password)}
									value={signInValues.confirmPassword}
									onChange={onChange}
								/>
							</LabeledBoxRow>
						)}
					</>
				)}
			</LabeledDialogBox>
			{page === 2 && (
				<>
					<Captcha />
					<div id="terms-agreed-container">
						<input
							type="checkbox"
							id="sign-in-terms-agreed"
							name="termsAgreed"
							required
							checked={signInValues.termsAgreed}
							onChange={onChange}
						/>
						<label htmlFor="sign-in-terms-agreed" className="translucent-text">
							I agree to the <Link href="/terms" target="_blank">terms of service</Link>.
						</label>
					</div>
				</>
			)}
			{page === 0 && (
				<div id="sign-up-link-container">
					<span className="translucent-text">Don't have an account? </span>
					<Link onClick={startSigningUp}>Sign Up</Link>
				</div>
			)}
		</div>
	);
};

export default SignIn;