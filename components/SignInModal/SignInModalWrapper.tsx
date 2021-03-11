import dynamic from 'next/dynamic';
import createGlobalState from '../../modules/globalState';

const SignInModal = dynamic(() => import('.'));

export const { useGlobalState: useSignInShown, setGlobalState: setSignInShown } = createGlobalState(false);

const SignInModalWrapper = () => {
	const [signInShown] = useSignInShown();
	
	return (
		<>
			{signInShown && <SignInModal />}
		</>
	);
};

export default SignInModalWrapper;