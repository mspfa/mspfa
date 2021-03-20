import type { AuthMethod } from 'modules/auth';
import { signIn } from 'modules/auth';
import Head from 'next/head';
import createGlobalState from 'global-react-state';
import Link from 'components/Link';
import { useCallback } from 'react';
import './styles.module.scss';

createGlobalState(false);

export type SignInProps = {
	signingUp: boolean,
	promptSignIn: Record<Exclude<AuthMethod['type'], 'password'>, () => void>
};

const SignIn = ({ signingUp, promptSignIn }: SignInProps) => (
	<div id="sign-in-content">
		<Head>
			<meta name="google-signin-client_id" content="910008890195-oqbrg6h1r62vv8fql0p6iffn9j9kanm2.apps.googleusercontent.com" />
			{/* I'm not sure if this is the best way to dynamically load the Google API from this component. If you are sure, then please submit an issue with an explanation. */}
			<script src="https://apis.google.com/js/platform.js" defer />
		</Head>
		<span className="translucent">
			{signingUp ? 'Sign up with' : 'Sign in with'}
		</span>
		<div id="sign-in-methods-external">
			<button id="sign-in-with-google" type="button" onClick={promptSignIn.google}>Google</button>
			<button id="sign-in-with-discord" type="button" onClick={promptSignIn.discord}>Discord</button>
		</div>
		<span className="translucent">or</span>
		<div id="sign-in-inputs">
			<label htmlFor="email">Email:</label>
			<input id="email" name="email" type="email" required autoComplete="email" maxLength={254} autoFocus={!signingUp} />
			<label htmlFor="password">Password:</label>
			<input id="password" name="password" type="password" required autoComplete={signingUp ? 'new-password' : 'current-password'} />
			{
				signingUp ? (
					<>
						<label htmlFor="confirm-password">Confirm:</label>
						<input id="confirm-password" name="confirmPassword" type="password" required autoComplete="new-password" />
					</>
				) : (
					<div id="reset-password-link-container">
						<Link className="translucent">Reset Password</Link>
					</div>
				)
			}
		</div>
		{
			signingUp && (
				<div id="accepted-terms-container">
					<input id="accepted-terms" name="acceptedTerms" type="checkbox" required />
					<label htmlFor="accepted-terms" className="translucent">
						I agree to the <Link href="/terms" target="_blank">terms of service</Link>.
					</label>
				</div>
			)
		}
		<div id="sign-up-link-container">
			<span className="translucent">
				{signingUp ? 'Already have an account? ' : "Don't have an account? "}
			</span>
			<Link
				onClick={
					useCallback(() => {
						signIn(!signingUp);
					}, [signingUp])
				}
			>
				{signingUp ? 'Sign In' : 'Sign Up'}
			</Link>
		</div>
	</div>
);

export default SignIn;