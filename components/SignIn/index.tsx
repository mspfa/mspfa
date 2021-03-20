import type { AuthMethod } from 'modules/auth';
import Head from 'next/head';
import createGlobalState from 'global-react-state';
import Link from 'components/Link';
import './styles.module.scss';

createGlobalState(false);

export type SignInProps = {
	promptSignIn: Record<Exclude<AuthMethod['type'], 'password'>, () => void>
};

const SignIn = ({ promptSignIn }: SignInProps) => (
	<div id="sign-in-content">
		<Head>
			<meta name="google-signin-client_id" content="910008890195-oqbrg6h1r62vv8fql0p6iffn9j9kanm2.apps.googleusercontent.com" />
			{/* I'm not sure if this is the best way to dynamically load the Google API from this component. If you are sure, then please submit an issue with an explanation. */}
			<script src="https://apis.google.com/js/platform.js" defer />
		</Head>
		<span className="translucent">Sign in with</span>
		<div id="sign-in-methods-external">
			<button id="sign-in-with-google" type="button" onClick={promptSignIn.google}>Google</button>
			<button id="sign-in-with-discord" type="button" onClick={promptSignIn.discord}>Discord</button>
		</div>
		<span className="translucent">or</span>
		<div id="sign-in-inputs">
			<label htmlFor="email">Email:</label>
			<input id="email" name="email" type="email" required autoFocus maxLength={254} autoComplete="email" />
			<label htmlFor="password">Password:</label>
			<input id="password" name="password" type="password" required autoComplete="current-password" />
			<div id="reset-password-link">
				<Link className="translucent">Reset Password</Link>
			</div>
		</div>
		<button id="sign-in-with-password" type="submit">Sign In</button>
		<span id="sign-up-link-container">
			<span className="translucent"> or </span>
			<Link>Sign Up</Link>
		</span>
	</div>
);

export default SignIn;