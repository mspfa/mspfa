import type { DialogManager } from 'components/Dialog';
import Dialog from 'components/Dialog';
import SignIn, { signInValues, resetSignInValues, setUser } from 'components/SignIn';
import api from 'lib/client/api';
import type { APIClient, APIError } from 'lib/client/api';
import type { AuthMethodOptions } from 'lib/client/auth';
import type { integer } from 'lib/types';
import Action from 'components/Dialog/Action';

type SessionAPI = APIClient<typeof import('pages/api/session').default>;
type UsersAPI = APIClient<typeof import('pages/api/users').default>;

let signInDialog: DialogManager<{}> | undefined;
/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
let signInPage = 0;

let authMethodOptions: AuthMethodOptions | undefined;

/** Resolve the sign-in dialog upon completion of an external auth method. */
export const resolveExternalSignIn = (newAuthMethodOptions: AuthMethodOptions) => {
	if (!signInDialog!.closed) {
		authMethodOptions = newAuthMethodOptions;
		signInDialog!.submit({ action: authMethodOptions.type });
	}
};

/** Whether new sign-in dialogs should be prevented from opening due to a previous sign-in dialog already loading. */
let signInLoading = false;

export const openSignInDialogInternally = () => {
	resetSignInValues();
	setSignInPage(0);
};

/** Sets the sign-in page of the sign-in dialog. Opens the sign-in dialog if it is not already open. */
export const setSignInPage = (
	/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
	newSignInPage: integer
) => {
	if (signInLoading) {
		Dialog.create(
			<Dialog title="Error">
				Your sign-in is already loading. Please wait.
			</Dialog>
		);
		return;
	}

	signInPage = newSignInPage;

	if (signInDialog && !signInDialog.closed) {
		// Manually resolve the previous sign-in dialog with a value other than `undefined` so that `resetForm` is not called when switching between sign-up stages.
		signInDialog.cancel({ action: 'overwrite' });
	}

	signInDialog = Dialog.create(
		<Dialog
			id="sign-in"
			title={signInPage ? 'Sign Up' : 'Sign In'}
		>
			<SignIn page={signInPage} />
			{signInPage === 0 ? (
				<>
					<Action value="password">Sign In</Action>
					<Action cancel value="exit">Cancel</Action>
				</>
			) : (
				<>
					{signInPage === 1 ? (
						<Action value="password">Continue</Action>
					) : (
						<Action>Sign Up</Action>
					)}
					<Action cancel value="back">Go Back</Action>
				</>
			)}
		</Dialog>
	);
	signInDialog.then(result => {
		if (result.action) {
			if (!result.canceled) {
				if (result.action === 'password') {
					authMethodOptions = {
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
						Dialog.create(
							<Dialog title="Error">
								Please complete the CAPTCHA challenge.
							</Dialog>
						);
						setSignInPage(signInPage);
						return;
					}

					signInLoading = true;
					(api as SessionAPI | UsersAPI).post(
						signInPage === 0 ? 'session' : 'users',
						{
							email: authMethodOptions!.type === 'password' ? signInValues.email : undefined,
							authMethod: authMethodOptions,
							...signInPage !== 0 && {
								captchaToken: signInValues.captchaToken,
								name: signInValues.name,
								birthdate: +signInValues.birthdate
							}
						} as any,
						{
							// Don't show the error dialog for failure to sign into an unverified account.
							beforeInterceptError: error => {
								// Check if the response has a user in it but not a verified email.
								if (error.response?.data.id && !error.response.data.email) {
									error.preventDefault();
								}
							}
						}
					).then(({ data }) => {
						// If sign-in or sign-up succeeds, reset the sign-in form and update the client's user state.
						signInLoading = false;
						resetSignInValues();
						setUser(data);
					}).catch((error: APIError) => {
						// If sign-in or sign-up fails, go back to sign-in screen.
						signInLoading = false;

						if (error.defaultPrevented) {
							resetSignInValues();

							Dialog.create(
								<Dialog id="verify-email" title="Verify Email">
									TODO
								</Dialog>
							);
						} else {
							setSignInPage(signInPage);
						}
					});
				}
			} else if (result.action === 'exit') {
				resetSignInValues();
			} else if (result.action === 'back') {
				setSignInPage(signInPage - 1);
			}
		} else {
			resetSignInValues();
		}
	});
};
