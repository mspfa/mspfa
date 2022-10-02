import getRateLimitMessage from 'lib/client/getRateLimitMessage';
import type { MyGetServerSideProps } from 'lib/server/pages';

const Component = () => null;

export default Component;

export const getServerSideProps: MyGetServerSideProps = async ({ res, query }) => {
	res.statusCode = 429;
	res.setHeader('Content-Type', 'text/plain');
	res.end(
		getRateLimitMessage(Number(query.retryAfter))
	);

	return { props: {} };
};
