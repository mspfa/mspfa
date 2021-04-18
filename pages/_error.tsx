import Page from 'components/Page';
import type { ServerResponse } from 'http';
import { useUser } from 'modules/client/users';
import Router from 'next/router';
import { useEffect } from 'react';

export type ErrorPageProps = { statusCode?: number };

const ErrorPage = ({ statusCode = 404 }: ErrorPageProps) => (
	<Page flashyTitle>
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

/** Wraps a page's component to serve an error page instead of the page component when a `statusCode` prop is passed to the page. */
export const withErrorPage = <
	/** The props of the page's component. */
	Props extends Record<string, any> = Record<string, unknown>
>(Component: (props: Props & { statusCode?: undefined }) => JSX.Element) => (
	({ statusCode, ...props }: Props) => {
		const user = useUser();

		useEffect(() => () => {
			// When the client switches users, reload the page so its server-side props are requested again, possibly updating `statusCode`.
			// For example, if a client is signed out on a page which they need to sign into in order to access, `statusCode === 403`. If they then sign in, the server-side props will return no `statusCode`, as well is any necessary data which only that user has access to for that page.
			Router.replace(Router.asPath);
		}, [user?.id]);

		return (
			statusCode === undefined
				? <Component {...props as any} />
				: <ErrorPage statusCode={statusCode} />
		);
	}
);