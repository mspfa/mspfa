import { Dialog } from 'modules/client/dialogs';
import dynamic from 'next/dynamic';
import { signInValues, resetSignInValues } from 'components/SignIn';
import api from 'modules/client/api';
import type { AuthMethod } from 'modules/server/users';
import type { APIClient } from 'modules/client/api';
import { setUser } from 'modules/client/users';

type SessionAPI = APIClient<typeof import('pages/api/session').default>;
type UsersAPI = APIClient<typeof import('pages/api/users').default>;

declare const gapi: any;

const SignIn = dynamic(() => import('components/SignIn'), {
	loading: () => <>Loading...</>
});

let signInDialog: Dialog<{}> | undefined;
/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
let signInPage = 0;

let authMethod: AuthMethod | undefined;

/** Resolves the sign-in dialog upon completion of an external auth method. */
const resolveExternalSignIn = (newAuthMethod: AuthMethod) => {
	authMethod = newAuthMethod;
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
						resolveExternalSignIn({
							type: 'google',
							value: user.getAuthResponse().id_token
						});
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
					if (evt.data.error === 'access_denied') {
						// Ignore `access_denied` because it is triggered when the user selects "Cancel" on the Discord auth screen.
						console.warn(evt.data);
					} else {
						console.error(evt.data);
						new Dialog({
							title: 'Error',
							content: evt.data.error_description
						});
					}
				} else if (signInDialog!.open) {
					resolveExternalSignIn({
						type: 'discord',
						value: evt.data.code
					});
				}
			}
		};
		window.addEventListener('message', onMessage);
	}
};

let signInLoading = false;

/** Opens a dialog prompting the user to sign in or sign up. */
export const signIn = () => {
	setSignInPage(0);
};

/** Sets the sign-in page of the sign-in dialog. Opens the sign-in dialog if it is not already open. */
export const setSignInPage = (
	/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
	newSignInPage: number
) => {
	if (signInLoading) {
		new Dialog({
			title: 'Error',
			content: 'Your sign-in is already loading. Please wait.'
		});
		return;
	}
	
	signInPage = newSignInPage;
	
	if (signInDialog && !signInDialog.resolved) {
		// Manually resolve the previous sign-in dialog with a value other than `undefined` so that `resetForm` is not called when switching between sign-up stages.
		signInDialog.resolve({ value: 'overwrite' }, false);
	}
	
	signInDialog = new Dialog({
		id: 'sign-in',
		index: 0, // This is necessary to prevent the sign-in dialog from covering up sign-in error dialogs.
		title: signInPage ? 'Sign Up' : 'Sign In',
		content: <SignIn page={signInPage} />,
		actions: signInPage === 0
			? [
				{ label: 'Sign In', value: 'password', focus: false },
				{ label: 'Cancel', value: 'exit' }
			]
			: [
				signInPage === 1
					? { label: 'Continue', value: 'password', focus: false }
					: { label: 'Sign Up', focus: false },
				{ label: 'Go Back', value: 'back' }
			]
	});
	signInDialog.then(result => {
		if (result) {
			if (result.submit) {
				if (result.value === 'password') {
					authMethod = {
						type: 'password',
						value: signInValues.password
					};
				}
				
				if (signInPage === 1) {
					// If the user submits the form while on the first stage of sign-up, move them to the next stage.
					setSignInPage(2);
				} else {
					// If the user submits the form while on the sign-in screen or on the last stage of sign-up, attempt sign-in or sign-up.
					signInLoading = true;
					(api as SessionAPI | UsersAPI).post(
						signInPage === 0 ? 'session' : 'users',
						{
							email: authMethod!.type === 'password' ? signInValues.email : undefined,
							authMethod,
							...(signInPage === 0 ? undefined : {
								name: signInValues.name,
								birthdate: +new Date(
									+signInValues.birthYear,
									+signInValues.birthMonth - 1,
									+signInValues.birthDay
								)
							})
						} as any
					).then(response => {
						// If sign-in or sign-up succeeds, reset the sign-in form and update the client's user state.
						signInLoading = false;
						resetSignInValues();
						setUser(response);
					}).catch(() => {
						// If sign-in or sign-up fails, go back to sign-in screen.
						signInLoading = false;
						setSignInPage(signInPage);
					});
				}
			} else if (result.value === 'exit') {
				resetSignInValues();
			} else if (result.value === 'back') {
				setSignInPage(signInPage - 1);
			}
		} else {
			resetSignInValues();
		}
	});
};