import { setSignInPage, promptExternalSignIn } from 'modules/client/auth';
import Head from 'next/head';
import Link from 'components/Link';
import { Field } from 'formik';
import { useEffect } from 'react';
import type { SetStateAction } from 'react';
import type { Dialog } from 'modules/client/dialogs';
import './styles.module.scss';

const startSigningUp = () => {
	setSignInPage(1);
};

/** The initial values of the sign-in dialog's form. */
export const initialValues = {
	email: '',
	password: '',
	confirmPassword: '',
	name: '',
	termsAgreed: false,
	birthDay: '',
	birthMonth: '',
	birthYear: ''
};

/** Values of the sign-in dialog's form. */
export type SignInValues = typeof initialValues;

export type SignInProps = {
	/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
	page: number,
	/** The current values of the sign-in dialog's form. */
	values: SignInValues,
	setValues: (values: SetStateAction<SignInValues>) => void
};

let globalValues: SignInProps['values'];
let globalSetValues: SignInProps['setValues'] | undefined;
let preservedValues: SignInValues = initialValues;

export const resetSignInForm = (signInDialog: Dialog<SignInValues>) => {
	signInDialog.helpers!.resetForm();
	globalValues = preservedValues = initialValues;
};

const SignIn = ({ page, values, setValues }: SignInProps) => {
	globalValues = values;
	globalSetValues = setValues;
	
	useEffect(() => {
		if (globalSetValues && globalValues !== preservedValues) {
			globalSetValues(preservedValues);
		}
		
		return () => {
			globalSetValues = undefined;
			preservedValues = globalValues;
		};
	}, [page]);
	
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
					<Head>
						<meta name="google-signin-client_id" content="910008890195-oqbrg6h1r62vv8fql0p6iffn9j9kanm2.apps.googleusercontent.com" />
						<script src="https://apis.google.com/js/platform.js" defer />
					</Head>
					<div className="translucent">
						{page ? 'Sign up with' : 'Sign in with'}
					</div>
					<div id="sign-in-methods-external">
						<button id="sign-in-with-google" type="button" onClick={promptExternalSignIn.google}>Google</button>
						<button id="sign-in-with-discord" type="button" onClick={promptExternalSignIn.discord}>Discord</button>
					</div>
					<div id="sign-in-divider" className="translucent">or</div>
				</>
			)}
			<div id="sign-in-inputs">
				{page === 2 ? (
					<>
						<label htmlFor="sign-in-name">Username:</label>
						<Field
							id="sign-in-name"
							name="name"
							autoComplete="username"
							required
							minLength={1}
							maxLength={32}
							autoFocus={!values.name}
						/>
						<label htmlFor="sign-in-birth-day">Birthdate:</label>
						<div id="sign-in-birthdate">
							<Field
								id="sign-in-birth-day"
								name="birthDay"
								type="number"
								autoComplete="bday-day"
								required
								placeholder="DD"
								min={1}
								max={new Date(+values.birthYear, +values.birthMonth, 0).getDate() || 31}
								size={4}
							/>
							<Field
								as="select"
								id="sign-in-birth-month"
								name="birthMonth"
								autoComplete="bday-month"
								required
								value={values.birthMonth}
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
							</Field>
							<Field
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
							/>
						</div>
					</>
				) : (
					<>
						<label htmlFor="sign-in-email">Email:</label>
						<Field
							key={page} // This is necessary to re-render this element when `page` changes, or else `autoFocus` will not work correctly.
							id="sign-in-email"
							name="email"
							type="email"
							autoComplete="email"
							required
							maxLength={254}
							autoFocus={!values.email}
						/>
						<label htmlFor="sign-in-password">Password:</label>
						<Field
							id="sign-in-password"
							name="password"
							type="password"
							autoComplete={page ? 'new-password' : 'current-password'}
							required
							minLength={8}
						/>
						{page === 0 ? (
							<div id="reset-password-link-container">
								<Link className="translucent">Reset Password</Link>
							</div>
						) : (
							<>
								<label htmlFor="sign-in-confirm-password">Confirm:</label>
								<Field
									id="sign-in-confirm-password"
									name="confirmPassword"
									type="password"
									autoComplete="new-password"
									required
									placeholder="Re-type Password"
									pattern={
										// Validate the confirmed password to match the password by escaping the password as a regular expression.
										values.password.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
									}
								/>
							</>
						)}
					</>
				)}
			</div>
			{page === 2 && (
				<div id="terms-agreed-container">
					<Field
						id="sign-in-terms-agreed"
						name="termsAgreed"
						type="checkbox"
						required
					/>
					<label htmlFor="sign-in-terms-agreed" className="translucent">
						I agree to the <Link href="/terms" target="_blank">terms of service</Link>.
					</label>
				</div>
			)}
			{page === 0 && (
				<div id="sign-up-link-container">
					<span className="translucent">Don't have an account? </span>
					<Link onClick={startSigningUp}>Sign Up</Link>
				</div>
			)}
		</div>
	);
};

export default SignIn;