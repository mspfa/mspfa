import { useRouter } from 'next/router';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';

const Component = () => {
	const router = useRouter();

	useIsomorphicLayoutEffect(() => {
		if (Object.values(router.query).length) {
			window.opener?.postMessage(router.query, location.origin);
			window.close();
		}
	});

	return null;
};

export default Component;