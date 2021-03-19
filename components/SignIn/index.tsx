import type { AuthMethod } from 'modules/auth';
import Head from 'next/head';
import './styles.module.scss';

export type SignInProps = {
	promptSignIn: Record<Exclude<AuthMethod['type'], 'password'>, () => void>
};

const SignIn = ({ promptSignIn }: SignInProps) => (
	<div id="sign-in-content">
		<Head>
			<meta name="google-signin-client_id" content="910008890195-oqbrg6h1r62vv8fql0p6iffn9j9kanm2.apps.googleusercontent.com" />
			{/* I'm not sure if this is the best way to dynamically load the Google API here. If you are sure, then please submit an issue. */}
			<script src="https://apis.google.com/js/platform.js" defer />
		</Head>
		<div id="sign-in-inputs-password">
			<label htmlFor="email">
				Email:
			</label>
			<input id="email" name="email" type="email" required autoFocus maxLength={254} autoComplete="email" />
			<label htmlFor="password">
				Password:
			</label>
			<input id="password" name="password" type="password" required autoComplete="current-password" />
			<button id="sign-in-with-password" type="submit">Sign In</button>
		</div>
		<p>or</p>
		<button id="sign-in-with-google" type="button" onClick={promptSignIn.google}>Google</button>
		<button id="sign-in-with-discord" type="button" onClick={promptSignIn.discord}>Discord</button>
	</div>
);

export default SignIn;