import { Dialog } from 'modules/dialogs';
import dynamic from 'next/dynamic';

declare const gapi: any;

const SignIn = dynamic(() => import('components/SignIn'), {
	loading: () => <>Loading...</>
});

export type AuthMethod =
	(
		{
			type: 'password' | 'google' | 'discord'
		}
		| {
			type: 'password',
			legacy: true
		}
	)
	& { value: string };

/**
 * Opens a dialog prompting the user to sign in or create an account.
 * 
 * When the dialog closes, resolves a boolean for whether the user signed in.
 */
export const signIn = () => new Promise<boolean>(resolve => {
	const promptSignIn = {
		google: () => {
			const handleError = (err: any) => {
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
					}).catch(handleError);
				}).catch(handleError);
			});
		},
		discord: () => {
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
		}
	};
	
	const signInDialog = new Dialog({
		id: 'sign-in',
		title: 'Sign In',
		content: <SignIn promptSignIn={promptSignIn} />,
		actions: [
			{ label: 'Cancel', submit: false, focus: false }
		]
	});
	signInDialog.then(result => {
		const submitted = !!result?.submit;
		resolve(submitted);
		
		if (submitted) {
			const elements = signInDialog.form!.elements as HTMLFormControlsCollection & {
				email: HTMLInputElement,
				password: HTMLInputElement
			};
			console.log(elements.email.value, elements.password.value);
		}
	});
});