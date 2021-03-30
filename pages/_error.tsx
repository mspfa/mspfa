import Page from 'components/Page';
import type { NextApiResponse } from 'next';

export type ErrorPageProps = { statusCode?: number };

const ErrorPage = ({ statusCode = 404 }: ErrorPageProps) => (
	<Page>
		{statusCode}
	</Page>
);

// @server-only {
ErrorPage.getInitialProps = ({ res, error }: {
	res?: NextApiResponse,
	error?: any
}) => ({
	statusCode: res?.statusCode || error?.statusCode || 404
});
// @server-only }

export default ErrorPage;