import type { IncomingMessage } from 'http';
import type { GetServerSideProps } from 'next';
import type { MyAppInitialProps } from 'pages/_app';
import type { ServerUser } from 'lib/server/users';

export type PageRequest = IncomingMessage & {
	/** The `initialProps` from `pages/_app`'s `getInitialProps`. */
	initialProps: MyAppInitialProps,
	/** The current authenticated user from `pages/_app`'s `getInitialProps`. */
	user?: ServerUser
};

type MyGetServerSidePropsContext = {
	req: PageRequest,
	params: Record<string, string | undefined>
};

export type MyGetServerSideProps<
	ServerSideProps extends Record<string, any> = {}
> = (
	GetServerSideProps extends (context: infer Context) => any
		? (
			context: Omit<Context, keyof MyGetServerSidePropsContext> & MyGetServerSidePropsContext
		) => Promise<{ props: ServerSideProps }>
		: never
);