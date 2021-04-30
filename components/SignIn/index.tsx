import './styles.module.scss';
import { setSignInPage, resolveExternalSignIn } from 'modules/client/auth';
import Link from 'components/Link';
import createUpdater from 'react-component-updater';
import type { ChangeEvent } from 'react';
import Captcha from 'components/SignIn/Captcha';
import LabeledGridRow from 'components/Grid/LabeledGridRow';
import { toPattern } from 'modules/client/utilities';
import LabeledDialogGrid from 'components/Grid/LabeledDialogGrid';
import ForgotPassword from 'components/ForgotPassword';
import AuthButton from 'components/Button/AuthButton';

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
	birthDay: '',
	birthMonth: '',
	birthYear: '',
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

	/**
	 * ```
	 * new Date().getFullYear()
	 * ```
	 */
	const nowFullYear = new Date().getFullYear();

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
			<LabeledDialogGrid>
				{page === 2 ? (
					<>
						<LabeledGridRow htmlFor="sign-in-name" label="Username">
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
						</LabeledGridRow>
						<LabeledGridRow htmlFor="sign-in-birth-day" label="Birthdate">
							<input
								id="sign-in-birth-day"
								name="birthDay"
								type="number"
								autoComplete="bday-day"
								required
								placeholder="DD"
								min={1}
								max={new Date(+signInValues.birthYear, +signInValues.birthMonth, 0).getDate() || 31}
								size={4}
								value={signInValues.birthDay}
								onChange={onChange}
							/>
							<select
								id="sign-in-birth-month"
								name="birthMonth"
								autoComplete="bday-month"
								required
								value={signInValues.birthMonth}
								onChange={onChange}
							>
								<option value="" disabled hidden>Month</option>
								<option value={1}>January</option>
								<option value={2}>February</option>
								<option value={3}>March</option>
								<option value={4}>April</option>
								<option value={5}>May</option>
								<option value={6}>June</option>
								<option value={7}>July</option>
								<option value={8}>August</option>
								<option value={9}>September</option>
								<option value={10}>October</option>
								<option value={11}>November</option>
								<option value={12}>December</option>
							</select>
							<input
								id="sign-in-birth-year"
								name="birthYear"
								type="number"
								autoComplete="bday-year"
								required
								placeholder="YYYY"
								min={
									// The maximum age is 1000 years old.
									nowFullYear - 1000
									// Maybe in the distant future, when anyone can live that long, or when aliens with longer life spans use our internet, MSPFA will still be here.
								}
								max={
									// The minimum age is 13 years old.
									nowFullYear - 13
								}
								size={nowFullYear.toString().length + 2}
								value={signInValues.birthYear}
								onChange={onChange}
							/>
						</LabeledGridRow>
					</>
				) : (
					<>
						<LabeledGridRow htmlFor="sign-in-email" label="Email">
							<input
								key={page} // This is necessary to re-render this element when `page` changes, or else `autoFocus` will not work correctly.
								id="sign-in-email"
								name="email"
								type="email"
								autoComplete="email"
								required
								maxLength={254}
								autoFocus={!signInValues.email}
								value={signInValues.email}
								onChange={onChange}
							/>
						</LabeledGridRow>
						<LabeledGridRow htmlFor="sign-in-password" label="Password">
							<input
								id="sign-in-password"
								name="password"
								type="password"
								autoComplete={page ? 'new-password' : 'current-password'}
								required
								minLength={8}
								value={signInValues.password}
								onChange={onChange}
							/>
						</LabeledGridRow>
						{page === 0 ? (
							<ForgotPassword />
						) : (
							<LabeledGridRow htmlFor="sign-in-confirm-password" label="Confirm">
								<input
									id="sign-in-confirm-password"
									name="confirmPassword"
									type="password"
									autoComplete="new-password"
									required
									placeholder="Re-Type Password"
									pattern={toPattern(signInValues.password)}
									value={signInValues.confirmPassword}
									onChange={onChange}
								/>
							</LabeledGridRow>
						)}
					</>
				)}
			</LabeledDialogGrid>
			{page === 2 && (
				<>
					<Captcha />
					<div id="terms-agreed-container">
						<input
							id="sign-in-terms-agreed"
							name="termsAgreed"
							type="checkbox"
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