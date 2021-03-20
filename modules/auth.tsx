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
			const onError = (err: any) => {
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
					}).catch(onError);
				}).catch(onError);
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
			const onMessage = (evt: MessageEvent<any>) => {
				if (evt.origin === window.origin && evt.source === win) {
					window.removeEventListener('message', onMessage);
					clearInterval(winClosedPoll);
					if (evt.data.error) {
						// Ignore `access_denied` because it is triggered when the user selects "Cancel" on the Discord auth screen.
						if (evt.data.error === 'access_denied') {
							console.warn(evt.data);
						} else {
							console.error(evt.data);
							new Dialog({
								title: 'Error',
								content: evt.data.error_description
							});
						}
					} else {
						console.log(evt.data.code);
					}
				}
			};
			window.addEventListener('message', onMessage);
		}
	};
	
	const signInDialog = new Dialog({
		id: 'sign-in',
		title: 'Sign In',
		content: <SignIn promptSignIn={promptSignIn} />,
		actions: [
			{ label: 'Sign In', focus: false },
			'Cancel'
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