import Page from 'components/Page';
import type { ServerResponse } from 'http';

export type ErrorPageProps = { statusCode?: number };

const ErrorPage = ({ statusCode = 404 }: ErrorPageProps) => (
	<Page>
		{statusCode}
	</Page>
);

ErrorPage.getInitialProps = ({ res, error }: {
	res?: ServerResponse,
	error?: any
}) => ({
	statusCode: res?.statusCode || error?.statusCode
});

export default ErrorPage;

/** Wraps a page's component to serve an error page instead of the page component when a `statusCode` prop set to an HTTP error code is passed to it. */
export const withErrorPage = <
	/** The props of the page's component. */
	Props extends Record<string, any> = Record<string, unknown>
>(
	Component: (
		props: Props & { statusCode?: undefined }
	) => JSX.Element
) => (
	({ statusCode, ...props }: Props) => (
		statusCode === undefined
			? <Component {...props as any} />
			: <ErrorPage statusCode={statusCode} />
	)
);