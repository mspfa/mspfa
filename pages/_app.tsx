import './styles.scss';
import 'lib/server/effects'; // @server-only
import App from 'next/app'; // @server-only
import authenticate from 'lib/server/auth/authenticate'; // @server-only
import { getPrivateUser } from 'lib/server/users'; // @server-only
import type { AppProps, AppContext } from 'next/app';
import type { NextPageContext } from 'next';
import Head from 'next/head';
import UserContext, { useUserMerge, useUserInApp } from 'lib/client/reactContexts/UserContext';
import type { PrivateUser } from 'lib/client/users';
import type { PageRequest } from 'lib/server/pages';
import React, { useEffect, useRef } from 'react';
import { setTheme } from 'lib/client/themes';
import { mergeWith } from 'lodash';
import UserCache from 'lib/client/reactContexts/UserCache';
import overwriteArrays from 'lib/client/overwriteArrays';
import { useRouter } from 'next/router';
import Dialog from 'lib/client/Dialog';

export type MyAppInitialProps = {
	user?: PrivateUser
};

export type MyAppProps = Omit<AppProps, 'pageProps'> & {
	/** An object with the app's `pageProps` on all server-side renders and the first client-side render, but an empty object on subsequent renders. */
	pageProps: Record<string, undefined> | {
		readonly [key: string]: unknown,
		initialProps: MyAppInitialProps
	}
};

const MyApp = ({
	Component,
	pageProps
}: MyAppProps) => {
	const { current: userCache } = useRef({});

	const user = useUserInApp(pageProps.initialProps?.user);
	const [userMerge] = useUserMerge();
	const mergedUser = (
		userMerge
			? user && mergeWith({}, user, userMerge, overwriteArrays)
			: user
	);

	const theme = mergedUser?.settings.theme || 'standard';

	useEffect(() => {
		setTheme(theme);
	}, [theme]);

	// Display an error dialog when an uncaught error occurs.
	useEffect(() => {
		const onError = (event: ErrorEvent) => {
			if (event.filename.startsWith(`${location.origin}/`)) {
				new Dialog({
					title: 'Uncaught Error',
					content: (
						<>
							<div className="red">
								{event.message}
							</div>
							<br />
							<div className="translucent">
								{event.error.stack || (
									`${event.error.message}\n    at ${event.filename}:${event.lineno}${event.colno ? `:${event.colno}` : ''}`
								)}
							</div>
						</>
					)
				});
			}
		};

		window.addEventListener('error', onError);

		return () => {
			window.removeEventListener('error', onError);
		};
	}, []);

	const router = useRouter();
	const asPathQueryIndex = router.asPath.indexOf('?');
	const asPathHashIndex = router.asPath.indexOf('#');
	const asPathEndIndex = (
		asPathQueryIndex === -1
			? asPathHashIndex
			: asPathHashIndex === -1
				? asPathQueryIndex
				: Math.min(asPathQueryIndex, asPathHashIndex)
	);

	return (
		<UserContext.Provider value={mergedUser}>
			<UserCache.Provider value={userCache}>
				<Head>
					<title>MS Paint Fan Adventures</title>
					<meta name="description" content="Hello, welcome to the bath house" />
					<meta name="author" content="MS Paint Fan Adventures" />
					<meta property="og:type" content="website" />
					<meta property="og:site_name" content="MS Paint Fan Adventures" />
					<meta property="og:description" content="Hello, welcome to the bath house" />
					<meta property="og:title" content="MS Paint Fan Adventures" />
					<meta property="og:image" content="/images/icon.png" />
					<link rel="icon" href="/images/icon.png" /* Image credit: heyitskane */ />
				</Head>
				<Component
					// This `key` is necessary so a page's states are reset when the route or any of its parameters changes.
					key={
						asPathEndIndex === -1
							? router.asPath
							// Slice off the query and the hash so states are not reset when they change.
							: router.asPath.slice(0, asPathEndIndex)
					}
					// It is necessary that the props object passed here is the original `pageProps` object and not a clone, because after this point is reached, props from a page's `getServerSideProps` are assigned to the original `pageProps` object and would otherwise not be passed into the page component.
					{...pageProps as any}
				/>
			</UserCache.Provider>
		</UserContext.Provider>
	);
};

// @server-only {
/** This runs server-side on every page request (only for initial requests by the browser, not by the Next router). */
MyApp.getInitialProps = async (appContext: AppContext) => {
	const appProps = await App.getInitialProps(appContext) as MyAppProps;

	// This exposes `initialProps` to `MyApp` (on the server and the client) and to every page's props (on the client).
	appProps.pageProps.initialProps = {};

	// `req` and `res` below are exposed to every page's `getServerSideProps` (on the server) and `pages/_document` (on the server).
	const { req, res } = appContext.ctx as NextPageContext & {
		req: PageRequest,
		res: NonNullable<NextPageContext['res']>
	};

	req.initialProps = appProps.pageProps.initialProps;

	const { user } = await authenticate(req, res);
	if (user) {
		req.user = user;

		appProps.pageProps.initialProps.user = getPrivateUser(user);
	}

	return appProps;
};
// @server-only }

export default MyApp;