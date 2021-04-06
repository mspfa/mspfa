import type { IncomingMessage } from 'http';
import type { GetServerSideProps } from 'next';
import type { MyAppPageProps } from 'pages/_app';
import type { UserDocument } from 'modules/server/users';

export type PageRequest = IncomingMessage & {
	user?: UserDocument,
	pageProps: MyAppPageProps
};

export type MyGetServerSideProps<
	ServerSideProps extends Record<string, any> = {}
> = (
	GetServerSideProps extends (context: infer Context) => any
		? (
			context: Context & { req: PageRequest }
		) => Promise<{
			props: ServerSideProps
		}>
		: never
);