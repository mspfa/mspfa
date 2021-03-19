import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Component = () => {
	const router = useRouter();
	
	useEffect(() => {
		if (router.isReady) {
			window.opener.postMessage(router.query, location.origin);
			window.close();
		}
	});
	
	return null;
};

export default Component;