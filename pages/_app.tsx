import type { AppProps } from 'next/dist/next-server/lib/router/router';
import Head from 'next/head';

const App = ({ Component, pageProps }: AppProps) => (
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
			<link rel="icon" href="/images/icon.png" /* Perfectly generic icon courtesy of keyitskane */ />
		</Head>
		<Component {...pageProps} />
	</>
);
export default App;