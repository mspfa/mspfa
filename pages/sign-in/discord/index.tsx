import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Component = () => {
	const router = useRouter();
	
	useEffect(() => {
		if (router.query.code) {
			window.opener.postMessage(router.query.code, location.origin);
			window.close();
		}
	});
	
	return <>Signing in...</>;
};

export default Component;