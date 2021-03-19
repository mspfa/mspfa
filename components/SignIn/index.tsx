import Head from 'next/head';
import { Dialog } from 'modules/dialogs';
import './styles.module.scss';

declare const gapi: any;

const signInWithGoogle = () => {
	const showError = (err: any) => {
		if (err.error === 'popup_closed_by_user') {
			console.warn(err);
		} else {
			console.error(err);
			new Dialog({
				title: 'Error',
				content: JSON.stringify(err)
			});
		}
	};
	
	gapi.load('auth2', () => {
		gapi.auth2.init().then((auth2: any) => {
			auth2.signIn().then((user: any) => {
				console.log(user.getAuthResponse().id_token);
			}).catch(showError);
		}).catch(showError);
	});
};

const signInWithDiscord = () => {
	const win = window.open(`https://discord.com/api/oauth2/authorize?client_id=822288507451080715&redirect_uri=${encodeURIComponent(location.origin)}%2Fsign-in%2Fdiscord&response_type=code&scope=identify%20email`, 'SignInWithDiscord');
	const winClosedPoll = setInterval(() => {
		if (!win || win.closed) {
			clearInterval(winClosedPoll);
			console.warn('The Discord sign-in page was closed.');
		}
	}, 200);
	const handleMessage = (evt: MessageEvent<any>) => {
		if (evt.origin === window.origin && evt.source === win) {
			window.removeEventListener('message', handleMessage);
			clearInterval(winClosedPoll);
			console.log(evt.data);
		}
	};
	window.addEventListener('message', handleMessage);
};

const SignInContent = () => (
	<div id="sign-in-content">
		<Head>
			{/* I'm not sure if this is the best way to dynamically load the Google API here. If you are sure, then please submit an issue. */}
			<script src="https://apis.google.com/js/platform.js" defer />
			<meta name="google-signin-client_id" content="910008890195-oqbrg6h1r62vv8fql0p6iffn9j9kanm2.apps.googleusercontent.com" />
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
		<button id="sign-in-with-google" type="button" onClick={signInWithGoogle}>Google</button>
		<button id="sign-in-with-discord" type="button" onClick={signInWithDiscord}>Discord</button>
	</div>
);

export default SignInContent;