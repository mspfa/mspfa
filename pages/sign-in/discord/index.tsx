import { useRouter } from 'next/router';
import { useLayoutEffect } from 'react';

const Component = () => {
	const router = useRouter();

	useLayoutEffect(() => {
		if (Object.keys(router.query).length) {
			window.opener.postMessage(router.query, location.origin);
			window.close();
		}
	});

	return null;
};

export default Component;