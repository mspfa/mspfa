import { startLoading, stopLoading } from 'components/LoadingIndicator';

/** Opens a dialog prompting the user to sign in or sign up. */
const promptSignIn = async () => {
	startLoading();
	const { openSignInDialog } = await import('lib/client/signIn');
	stopLoading();

	openSignInDialog();
};

export default promptSignIn;