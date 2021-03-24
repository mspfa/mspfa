import { Dialog } from 'modules/client/dialogs';
import dynamic from 'next/dynamic';
import { getInputValue, resetForm } from 'components/SignIn';
import api from './api';
import type { AuthMethod } from 'modules/server/auth';
import type { APIClient } from './api';

type SessionAPI = APIClient<typeof import('pages/api/session').default>;
type UsersAPI = APIClient<typeof import('pages/api/users').default>;

declare const gapi: any;

const SignIn = dynamic(() => import('components/SignIn'), {
	loading: () => <>Loading...</>
});

let signInDialog: Dialog | undefined;
/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
let signUpStage = 0;

let authMethod: AuthMethod;

const resolveExternalSignIn = () => {
	signInDialog!.resolve({ submit: true, value: authMethod.type });
};

export const promptExternalSignIn = {
	google: () => {
		const onError = (error: any) => {
			if (error.error === 'popup_closed_by_user') {
				console.warn(error);
			} else {
				console.error(error);
				new Dialog({
					title: 'Error',
					content: JSON.stringify(error)
				});
			}
		};
		
		gapi.load('auth2', () => {
			gapi.auth2.init().then((auth2: any) => {
				auth2.signIn().then((user: any) => {
					if (signInDialog!.open) {
						authMethod = {
							type: 'google',
							value: user.getAuthResponse().id_token
						};
						resolveExternalSignIn();
					}
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
				} else if (signInDialog!.open) {
					authMethod = {
						type: 'discord',
						value: evt.data.code
					};
					resolveExternalSignIn();
				}
			}
		};
		window.addEventListener('message', onMessage);
	}
};

let signInLoading = false;

/** Opens a dialog prompting the user to sign in or sign up. */
export const signIn = (newSignUpStage = 0) => {
	if (signInLoading) {
		new Dialog({
			title: 'Error',
			content: 'Your sign-in is already loading. Please wait.'
		});
		return;
	}
	
	signUpStage = newSignUpStage;
	
	if (signInDialog && !signInDialog.resolved) {
		// Manually resolve the previous sign-in dialog with a value other than `undefined` so that `resetForm` is not called when switching between sign-up stages.
		signInDialog.resolve({ value: 'overwrite' }, false);
	}
	
	signInDialog = new Dialog({
		id: 'sign-in',
		index: 0, // This is necessary to prevent the sign-in dialog from covering up sign-in error dialogs.
		title: signUpStage ? 'Sign Up' : 'Sign In',
		content: <SignIn signUpStage={signUpStage} />,
		actions: signUpStage === 0
			? [
				{ label: 'Sign In', value: 'password', focus: false },
				{ label: 'Cancel', value: 'exit' }
			]
			: [
				signUpStage === 1
					? { label: 'Continue', value: 'password', focus: false }
					: { label: 'Sign Up', focus: false },
				{ label: 'Go Back', value: 'back' }
			]
	});
	signInDialog.then(result => {
		if (result) {
			if (result.submit) {
				if (signUpStage === 1) {
					// If the user submits the form while on the first stage of sign-up, move them to the next stage.
					if (result.value === 'password') {
						authMethod = {
							type: 'password',
							value: getInputValue.password()
						};
					}
					signIn(2);
				} else {
					// If the user submits the form while on the sign-in screen or on the last stage of sign-up, attempt sign-in or sign-up.
					signInLoading = true;
					(api as SessionAPI | UsersAPI).post(signUpStage === 0 ? 'session' : 'users', {
						email: authMethod.type === 'password' ? getInputValue.email() : undefined,
						authMethod,
						...(signUpStage === 0 ? undefined : {
							name: getInputValue.name(),
							birthdate: +new Date(+getInputValue.birthYear(), +getInputValue.birthMonth() - 1, +getInputValue.birthDay())
						})
					} as any).then(response => {
						// If sign-in or sign-up succeeds, reset the sign-in form and update the client's user state.
						signInLoading = false;
						resetForm();
						console.log(response);
					}).catch(() => {
						// If sign-in or sign-up fails, go back to sign-in screen.
						signInLoading = false;
						signIn(signUpStage);
					});
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