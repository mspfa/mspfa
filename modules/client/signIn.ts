const signIn = async () => {
	const { openSignInDialog } = await import('modules/client/auth');
	openSignInDialog();
};

export default signIn;