import type { AuthMethod } from 'modules/auth';
import { signIn } from 'modules/auth';
import Head from 'next/head';
import Link from 'components/Link';
import createGlobalState from 'global-react-state';
import type { ChangeEvent } from 'react';
import './styles.module.scss';

const startSigningUp = () => {
	signIn(1);
};

export type SignInProps = {
	/** 0 or undefined if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
	signUpStage?: number,
	promptSignIn: Record<Exclude<AuthMethod['type'], 'password'>, () => void>
};

const [useUsername, setUsername] = createGlobalState('');
const [useEmail, setEmail] = createGlobalState('');
const [usePassword, setPassword] = createGlobalState('');
const [useConfirmPassword, setConfirmPassword] = createGlobalState('');
const [useAcceptedTerms, setAcceptedTerms] = createGlobalState(false);

const setInput = {
	username: setUsername,
	email: setEmail,
	password: setPassword,
	confirmPassword: setConfirmPassword
};

const onChange = (
	evt: ChangeEvent<HTMLInputElement & { name: keyof typeof setInput }>
) => {
	setInput[evt.target.name](evt.target.value);
};

const onAcceptedTermsChange = (evt: ChangeEvent<HTMLInputElement>) => {
	setAcceptedTerms(evt.target.checked);
};

const SignIn = ({ signUpStage, promptSignIn }: SignInProps) => {
	const [username] = useUsername();
	const [email] = useEmail();
	const [password] = usePassword();
	const [confirmPassword] = useConfirmPassword();
	const [acceptedTerms] = useAcceptedTerms();
	
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
						<button id="sign-in-with-google" type="button" onClick={promptSignIn.google}>Google</button>
						<button id="sign-in-with-discord" type="button" onClick={promptSignIn.discord}>Discord</button>
					</div>
					<div id="sign-in-divider" className="translucent">or</div>
				</>
			)}
			<div id="sign-in-inputs">
				{signUpStage === 2 ? (
					<>
						<label htmlFor="sign-in-username">Username:</label>
						<input
							id="sign-in-username"
							name="username"
							required
							autoComplete="username"
							minLength={2}
							maxLength={32}
							autoFocus
							value={username}
							onChange={onChange}
						/>
					</>
				) : (
					<>
						<label htmlFor="sign-in-email">Email:</label>
						<input
							id="sign-in-email"
							name="email"
							type="email"
							required
							autoComplete="email"
							maxLength={254}
							autoFocus
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
							checked={acceptedTerms}
							onChange={onAcceptedTermsChange}
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