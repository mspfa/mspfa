import App from 'next/app';
import type { AppProps, AppContext } from 'next/app';
import Head from 'next/head';
import { SWRConfig } from 'swr';
import Cookies from 'cookies'; // @server-only
import users from 'modules/server/users'; // @server-only
import { ObjectId } from 'bson'; // @server-only
import * as MSPFA from 'modules/client/MSPFA'; // @client-only
import 'styles/global.scss';

(global as any).MSPFA = MSPFA; // @client-only

const MyApp = ({
	Component,
	pageProps: { user, ...pageProps }
}: AppProps) => (
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
			<Component {...pageProps} />
		</SWRConfig>
	</>
);

// @server-only {
/** This runs server-side on every request. */
MyApp.getInitialProps = async (appContext: AppContext) => {
	const appProps = await App.getInitialProps(appContext);
	
	const { req, res } = appContext.ctx;
	if (req && res) {
		const cookies = new Cookies(req, res);
		/** The client's `Authorization` header or `auth` cookie in the format of [the HTTP `Authorization` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization). */
		const authorization = req.headers.authorization || cookies.get('auth');
		if (authorization && authorization.startsWith('Basic ')) {
			const match = /^([^:]+):([^:]+)$/.exec(Buffer.from(authorization.slice(6), 'base64').toString());
			if (match) {
				const [, id, token] = match;
				const user = await users.findOne({
					_id: new ObjectId(id)
				});
				if (user) {
					// TODO: Check `token`
					appProps.pageProps.user = user;
				}
			}
		}
	}
	
	return appProps;
};
// @server-only }

export default MyApp;