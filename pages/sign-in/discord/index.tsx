import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Component = () => {
	const router = useRouter();
	
	useEffect(() => {
		if (Object.keys(router.query).length) {
			window.opener.postMessage(router.query, location.origin);
			window.close();
		}
	});
	
	return null;
};

export default Component;