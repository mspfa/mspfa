import { Dialog } from 'modules/client/dialogs';
import SignIn, { signInValues, resetSignInValues } from 'components/SignIn';
import api from 'modules/client/api';
import type { AuthMethod } from 'modules/server/users';
import type { APIClient } from 'modules/client/api';
import { setUser } from 'modules/client/users';
import env from 'modules/client/env';

type SessionAPI = APIClient<typeof import('pages/api/session').default>;
type UsersAPI = APIClient<typeof import('pages/api/users').default>;

declare const gapi: any;

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
		const win = window.open(`https://discord.com/api/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(location.origin)}%2Fsign-in%2Fdiscord&response_type=code&scope=identify%20email`, 'SignInWithDiscord');
		const winClosedPoll = setInterval(() => {
			if (!win || win.closed) {
				clearInterval(winClosedPoll);
				console.warn('The Discord sign-in page was closed.');
			}
		}, 200);
		const onMessage = (event: MessageEvent<any>) => {
			if (event.origin === window.origin && event.source === win) {
				window.removeEventListener('message', onMessage);
				clearInterval(winClosedPoll);
				if (event.data.error) {
					if (event.data.error === 'access_denied') {
						// Ignore `access_denied` because it is triggered when the user selects "Cancel" on the Discord auth screen.
						console.warn(event.data);
					} else {
						console.error(event.data);
						new Dialog({
							title: 'Error',
							content: event.data.error_description
						});
					}
				} else if (signInDialog!.open) {
					resolveExternalSignIn({
						type: 'discord',
						value: event.data.code
					});
				}
			}
		};
		window.addEventListener('message', onMessage);
	}
};

/** Whether new sign-in dialogs should be prevented from opening due to a previous sign-in dialog already loading. */
let signInLoading = false;

export const openSignInDialog = () => {
	resetSignInValues();
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

					if (signInPage === 2 && !signInValues.captchaToken) {
						new Dialog({
							title: 'Error',
							content: 'Please complete the CAPTCHA challenge.'
						});
						setSignInPage(signInPage);
						return;
					}

					signInLoading = true;
					(api as SessionAPI | UsersAPI).post(
						signInPage === 0 ? 'session' : 'users',
						{
							email: authMethod!.type === 'password' ? signInValues.email : undefined,
							authMethod,
							...signInPage !== 0 && {
								captchaToken: signInValues.captchaToken,
								name: signInValues.name,
								birthdate: +new Date(
									+signInValues.birthYear,
									+signInValues.birthMonth - 1,
									+signInValues.birthDay
								)
							}
						} as any,
						{
							// Don't show the error dialog for failure to sign into an unverified account.
							beforeInterceptError: error => {
								// Check if the response has a user in it but not a verified email.
								if (error.response?.data.id && !error.response.data.email) {
									error.preventDefault();

									// Set a property on `error` to be read in the `catch` block afterward.
									error.unverifiedEmail = true;
								}
							}
						}
					).then(({ data }) => {
						// If sign-in or sign-up succeeds, reset the sign-in form and update the client's user state.
						signInLoading = false;
						resetSignInValues();
						setUser(data);
					}).catch(({ unverifiedEmail }) => {
						// If sign-in or sign-up fails, go back to sign-in screen.
						signInLoading = false;

						if (unverifiedEmail) {
							resetSignInValues();

							new Dialog({
								id: 'verify-email',
								title: 'Verify Email',
								content: 'TODO'
							});
						} else {
							setSignInPage(signInPage);
						}
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