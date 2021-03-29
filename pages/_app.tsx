import App from 'next/app'; // @server-only
import type { AppProps, AppContext } from 'next/app';
import Head from 'next/head';
import { SWRConfig } from 'swr';
import { authenticate } from 'modules/server/auth'; // @server-only
import { getClientUser } from 'modules/server/users'; // @server-only
import { UserContext, useUserState } from 'modules/client/users';
import * as MSPFA from 'modules/client/MSPFA'; // @client-only
import 'styles/global.scss';

(global as any).MSPFA = MSPFA; // @client-only

const MyApp = ({
	Component,
	pageProps: {
		// This value is the user data passed in from the server in `getInitialProps`. Any re-renders will set this value to `undefined`.
		user: userProp,
		...pageProps
	}
}: AppProps) => {
	const user = useUserState(userProp);
	
	return (
		<>
			<Head>
				<title>MS Paint Fan Adventures</title>
				<meta name="description" content="Hello, welcome to the bath house" />
				<meta name="author" content="MS Paint Fan Adventures" />
				<meta property="og:type" content="website" />
				<meta property="og:site_name" content="MS Paint Fan Adventures" />
				<meta property="og:description" content="Hello, welcome to the bath house" />
				<meta property="og:title" content="MS Paint Fan Adventures" />
				<meta property="og:image" content="/images/icon.png" />
				<link rel="icon" href="/images/icon.png" /* Perfectly generic icon by heyitskane */ />
			</Head>
			<SWRConfig
				value={{
					revalidateOnMount: true,
					revalidateOnFocus: false,
					revalidateOnReconnect: false
				}}
			>
				<UserContext.Provider value={user}>
					<Component {...pageProps} />
				</UserContext.Provider>
			</SWRConfig>
		</>
	);
};

// @server-only {
/** This runs server-side on every page request. */
MyApp.getInitialProps = async (appContext: AppContext) => {
	const appProps = await App.getInitialProps(appContext);
	
	const { req, res } = appContext.ctx;
	if (req && res) {
		const user = await authenticate(req, res);
		if (user) {
			appProps.pageProps.user = getClientUser(user);
		}
	}
	
	return appProps;
};
// @server-only }

export default MyApp;