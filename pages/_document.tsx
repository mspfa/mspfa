import NextDocument, { Html, Head, Main, NextScript } from 'next/document';
import type { DocumentContext } from 'next/document';

export default class extends NextDocument {
	static async getInitialProps(ctx: DocumentContext) {
		const initialProps = await NextDocument.getInitialProps(ctx);
		return { ...initialProps };
	}

	render() {
		return (
			<Html lang="en">
				<Head />
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}