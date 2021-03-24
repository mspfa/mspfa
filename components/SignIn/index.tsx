import { signIn, promptExternalSignIn } from 'modules/client/auth';
import Head from 'next/head';
import Link from 'components/Link';
import createGlobalState from 'global-react-state';
import type { GlobalStateHook, GlobalStateSetter, GlobalStateGetter } from 'global-react-state';
import type { ChangeEvent } from 'react';
import './styles.module.scss';

const startSigningUp = () => {
	signIn(1);
};

const inputNames = ['email', 'password', 'confirmPassword', 'name', 'birthDay', 'birthMonth', 'birthYear'] as const;
type InputName = typeof inputNames extends ReadonlyArray<infer Item> ? Item : never;

const useInputValue: Record<InputName, GlobalStateHook<string>> = {} as any;
const setInputValue: Record<InputName, GlobalStateSetter<string>> = {} as any;
export const getInputValue: Record<InputName, GlobalStateGetter<string>> = {} as any;

for (const inputName of inputNames) {
	[useInputValue[inputName], setInputValue[inputName], getInputValue[inputName]] = createGlobalState('');
}

/** Resets the values of all sign-in form inputs. */
export const resetForm = () => {
	for (const inputName of inputNames) {
		setInputValue[inputName]('');
	}
};

const onChange = (
	evt: ChangeEvent<HTMLInputElement & HTMLSelectElement & { name: keyof typeof setInputValue }>
) => {
	setInputValue[evt.target.name](evt.target.value);
};

export type SignInProps = {
	/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
	signUpStage: number
};

const SignIn = ({ signUpStage }: SignInProps) => {
	const [email] = useInputValue.email();
	const [password] = useInputValue.password();
	const [confirmPassword] = useInputValue.confirmPassword();
	const [name] = useInputValue.name();
	const [birthDay] = useInputValue.birthDay();
	const [birthMonth] = useInputValue.birthMonth();
	const [birthYear] = useInputValue.birthYear();
	
	return (
		<div id="sign-in-content">
			{signUpStage !== 2 && (
				<>
					<Head>
						<meta name="google-signin-client_id" content="910008890195-oqbrg6h1r62vv8fql0p6iffn9j9kanm2.apps.googleusercontent.com" />
						{/* I'm not sure if this is the best way to dynamically load the Google API. If you are sure, then please submit an issue with an explanation. */}
						<script src="https://apis.google.com/js/platform.js" defer />
					</Head>
					<div className="translucent">
						{signUpStage ? 'Sign up with' : 'Sign in with'}
					</div>
					<div id="sign-in-methods-external">
						<button id="sign-in-with-google" type="button" onClick={promptExternalSignIn.google}>Google</button>
						<button id="sign-in-with-discord" type="button" onClick={promptExternalSignIn.discord}>Discord</button>
					</div>
					<div id="sign-in-divider" className="translucent">or</div>
				</>
			)}
			<div id="sign-in-inputs">
				{signUpStage === 2 ? (
					<>
						<label htmlFor="sign-in-name">Username:</label>
						<input
							id="sign-in-name"
							name="name"
							required
							autoComplete="username"
							minLength={1}
							maxLength={32}
							autoFocus={!name}
							value={name}
							onChange={onChange}
						/>
						<label htmlFor="sign-in-birth-day">Birthdate:</label>
						<div id="sign-in-birthdate">
							<input
								id="sign-in-birth-day"
								name="birthDay"
								type="number"
								required
								autoComplete="bday-day"
								placeholder="DD"
								min={1}
								max={new Date(+birthYear, +birthMonth, 0).getDate() || 31}
								size={4}
								value={birthDay}
								onChange={onChange}
							/>
							<select
								id="sign-in-birth-month"
								name="birthMonth"
								required
								autoComplete="bday-month"
								value={birthMonth}
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
								required
								autoComplete="bday-year"
								placeholder="YYYY"
								min={1}
								max={new Date().getFullYear()}
								size={String(new Date().getFullYear()).length + 2}
								value={birthYear}
								onChange={onChange}
							/>
						</div>
					</>
				) : (
					<>
						<label htmlFor="sign-in-email">Email:</label>
						<input
							key={signUpStage} // This is necessary to re-render this element when `signUpStage` changes, or else `autoFocus` will not work correctly.
							id="sign-in-email"
							name="email"
							type="email"
							required
							autoComplete="email"
							maxLength={254}
							autoFocus={!email}
							value={email}
							onChange={onChange}
						/>
						<label htmlFor="sign-in-password">Password:</label>
						<input
							id="sign-in-password"
							name="password"
							type="password"
							required
							autoComplete={signUpStage ? 'new-password' : 'current-password'}
							value={password}
							onChange={onChange}
						/>
						{signUpStage === 0 ? (
							<div id="reset-password-link-container">
								<Link className="translucent">Reset Password</Link>
							</div>
						) : (
							<>
								<label htmlFor="sign-in-confirm-password">Confirm:</label>
								<input
									id="sign-in-confirm-password"
									name="confirmPassword"
									type="password"
									required
									autoComplete="new-password"
									placeholder="Re-type Password"
									pattern={
										// Validate the confirmed password to match the password by escaping the password as a regular expression.
										password.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
									}
									value={confirmPassword}
									onChange={onChange}
								/>
							</>
						)}
					</>
				)}
			</div>
			{signUpStage === 2 && (
				<>
					<div id="accepted-terms-container">
						<input
							id="sign-in-accepted-terms"
							name="acceptedTerms"
							type="checkbox"
							required
						/>
						<label htmlFor="sign-in-accepted-terms" className="translucent">
							I agree to the <Link href="/terms" target="_blank">terms of service</Link>.
						</label>
					</div>
				</>
			)}
			{signUpStage === 0 && (
				<div id="sign-up-link-container">
					<span className="translucent">Don't have an account? </span>
					<Link onClick={startSigningUp}>Sign Up</Link>
				</div>
			)}
		</div>
	);
};

export default SignIn;