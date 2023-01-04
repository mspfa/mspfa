import { useRouter } from 'next/router';
import useIsomorphicLayoutEffect from 'use-isomorphic-layout-effect';

const Component = () => {
	const router = useRouter();

	useIsomorphicLayoutEffect(() => {
		if (Object.values(router.query).length) {
			window.opener?.postMessage(router.query, location.origin);
			window.close();
		}
	});
};

export default Component;
