import type { MyGetServerSideProps } from 'modules/server/pages';
import ErrorPage from 'pages/_error';

/** Sets `res.statusCode` based on the returned `statusCode` prop. */
export const withStatusCode = <
	ServerSideProps extends Record<string, any> = {}
>(getServerSideProps: MyGetServerSideProps<ServerSideProps>): MyGetServerSideProps<ServerSideProps> => (
	async props => {
		const serverSideProps = await getServerSideProps(props);

		if (serverSideProps.props.statusCode) {
			props.res.statusCode = serverSideProps.props.statusCode;
		}

		const errorPageProps = ErrorPage.getInitialProps(props);

		if (errorPageProps.statusCode >= 400) {
			Object.assign(serverSideProps.props, errorPageProps);
		}

		return serverSideProps;
	}
);