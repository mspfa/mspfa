import Document, { Html, Head, Main, NextScript } from 'next/document';
import type { DocumentContext, DocumentInitialProps } from 'next/document';
import type { PageRequest } from 'lib/server/pages';

type MyDocumentInitialProps = DocumentInitialProps & {
	req: PageRequest
};

class MyDocument extends Document {
	static async getInitialProps(ctx: DocumentContext) {
		const initialProps = await Document.getInitialProps(ctx) as MyDocumentInitialProps;

		// The type assertion below is necessary because `ctx.req` is initially not a `PageRequest` but is mutated into a `PageRequest` in `pages/_app`'s `getInitialProps`.
		initialProps.req = ctx.req as PageRequest;

		return initialProps;
	}

	render() {
		const req: PageRequest = (this.props as any).req;

		return (
			<Html
				lang="en"
				className={`theme-${req.user?.settings.theme || 'standard'}`}
			>
				<Head />
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

export default MyDocument;