import { useRouter } from 'next/router';
import Page from '../components/Page';

const Component = () => {
	const router = useRouter();
	return (
		<Page noFlashyTitle={'s' in router.query}>
			test
		</Page>
	);
};
export default Component;