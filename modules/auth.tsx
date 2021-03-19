import { Dialog } from 'modules/dialogs';
import dynamic from 'next/dynamic';

const SignIn = dynamic(() => import('components/SignIn'), {
	loading: () => <>Loading...</>
});

export type AuthMethod = {
	type: 'password' | 'google' | 'discord',
	value: string
};

/**
 * Opens a dialog prompting the user to sign in or create an account.
 * 
 * When the dialog closes, resolves a boolean for whether the user signed in.
 */
export const signIn = () => new Promise<boolean>(resolve => {
	const signInDialog = new Dialog({
		id: 'sign-in',
		title: 'Sign In',
		content: <SignIn />,
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