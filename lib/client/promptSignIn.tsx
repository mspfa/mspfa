import Dialog from 'components/Dialog';
import Action from 'components/Dialog/Action';
import openSignInDialog from 'lib/client/openSignInDialog';
import type { ReactNode } from 'react';

export type PromptSignInOptions = {
	/** The dialog's title. */
	title: ReactNode,
	/** The dialog's content, usually of the format `` `Sign in to ${string}!` ``. */
	content: ReactNode
};

/** Opens a dialog prompting the user to sign in. Resolves to a boolean of whether the user confirmed with the option to sign in. */
const promptSignIn = async ({ title, content }: PromptSignInOptions) => {
	const confirmedSignIn = await Dialog.confirm(
		<Dialog id="prompt-sign-in" title={title}>
			{content}<br />
			(Don't worry; this page will stay open.)

			<Action autoFocus>Sign In</Action>
			{Action.CANCEL}
		</Dialog>
	);

	if (confirmedSignIn) {
		openSignInDialog();
	}

	return confirmedSignIn;
};

export default promptSignIn;
