import Page from 'components/Page';
import type { ServerResponse } from 'http';

export type ErrorPageProps = { statusCode?: number };

const ErrorPage = ({ statusCode = 404 }: ErrorPageProps) => (
	<Page flashyTitle>
		{statusCode}
	</Page>
);

// Pass the status code from Next to `ErrorPage`'s props.
ErrorPage.getInitialProps = ({ res, error }: {
	res?: ServerResponse,
	error?: any
}) => ({
	statusCode: res?.statusCode || error?.statusCode
});

export default ErrorPage;