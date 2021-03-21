import { Dialog } from 'modules/dialogs';
import dynamic from 'next/dynamic';
import { getInputValue, resetForm } from 'components/SignIn';

declare const gapi: any;

const SignIn = dynamic(() => import('components/SignIn'), {
	loading: () => <>Loading...</>
});

export type AuthMethod = (
	(
		{
			type: 'password' | 'google' | 'discord'
		}
		| {
			type: 'password',
			legacy: true
		}
	)
	& { value: string }
);

let signInDialog: Dialog | undefined;
/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
let signUpStage = 0;

export const promptExternalSignIn = {
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

/**
 * Opens a dialog prompting the user to sign in or create an account.
 * 
 * When the dialog closes, resolves a boolean for whether the user signed in.
 */
export const signIn = (newSignUpStage = 0) => {
	signUpStage = newSignUpStage;
	
	if (signInDialog && !signInDialog.resolved) {
		// Manually resolve the previous sign-in dialog with a value other than `undefined` so that `resetForm` is not called when switching between sign-up stages.
		signInDialog.resolve({ value: 'overwrite' }, false);
	}
	
	signInDialog = new Dialog({
		id: 'sign-in',
		title: signUpStage ? 'Sign Up' : 'Sign In',
		content: <SignIn signUpStage={signUpStage} />,
		actions: signUpStage === 0
			? [
				{ label: 'Sign In', focus: false },
				{ label: 'Cancel', value: 'exit' }
			]
			: [
				{
					label: signUpStage === 1 ? 'Continue' : 'Sign Up',
					focus: false
				},
				{ label: 'Go Back', value: 'back' }
			]
	});
	signInDialog.then(result => {
		if (result) {
			if (result.submit) {
				if (signUpStage === 1) {
					// If the user is on stage 1 (first stage of signing up), and they submit the dialog's form, move them to the next stage.
					signIn(signUpStage + 1);
				} else {
					// If the user is on stage 0 (signing in) or stage 2 (final stage of signing up), and they submit the dialog's form, then use the provided email and password credentials.
					console.log(getInputValue.email(), getInputValue.password());
				}
			} else if (result.value === 'exit') {
				resetForm();
			} else if (result.value === 'back') {
				signIn(signUpStage - 1);
			}
		} else {
			resetForm();
		}
	});
};