import { startLoading, stopLoading } from 'components/LoadingIndicator';

/** Opens the sign-in/sign-up dialog. */
const openSignInDialog = async () => {
	startLoading();
	const { default: SignInDialog } = await import('components/SignInDialog');
	stopLoading();

	SignInDialog.create();
};

export default openSignInDialog;
