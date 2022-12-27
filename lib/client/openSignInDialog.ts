import { startLoading, stopLoading } from 'components/LoadingIndicator';

/** Opens the sign-in/sign-up dialog. */
const openSignInDialog = async () => {
	startLoading();
	const { openSignInDialogInternally } = await import('lib/client/signIn');
	stopLoading();

	openSignInDialogInternally();
};

export default openSignInDialog;
