import { useUser } from 'lib/client/reactContexts/UserContext';
import Router from 'next/router';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Loading from 'components/LoadingIndicator/Loading';

const ErrorPage = dynamic(() => import('pages/_error'), { loading: Loading });

let reloadsToPrevent = 0;

/** Prevent a number of the following reloads caused by user ID updates. */
export const preventReloads = (
	/** How many additional reloads to prevent. Defaults to 1. */
	count = 1
) => reloadsToPrevent += count;

/** Wraps a page's component to serve an error page instead of the page component when a `statusCode` prop is passed to the page. */
export const withErrorPage = <
	/** The props of the page's component. */
	Props extends Record<string, any> = Record<string, unknown>
>(
	Component: (props: Props & { statusCode?: undefined }) => JSX.Element
) => (
	({ statusCode, ...props }: Props) => {
		const user = useUser();
		const userID = user?.id;

		const [previousUserID, setPreviousUserID] = useState(userID);

		if (userID !== previousUserID) {
			// The client switched users.

			if (reloadsToPrevent) {
				reloadsToPrevent--;
			} else {
				// When the client switches users, reload the page so its server-side props are requested again, possibly updating `statusCode`.
				// For example, if a client is signed out on a page which they need to sign into in order to access, `statusCode === 403`. If they then sign in, the server-side props will return no `statusCode`, as well is any necessary data which only that user has access to for that page.
				// This incidentally causes a real window reload if the server tries to send the client an HTTP error status code.
				Router.replace(Router.asPath);

				// Do NOT prevent leave confirmations here. The user should be allowed to sign in or sign out without losing unsaved changes.
			}

			setPreviousUserID(userID);
		}

		return (
			statusCode === undefined
				? <Component {...props as any} />
				: <ErrorPage statusCode={statusCode} {...props} />
		);
	}
);