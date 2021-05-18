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

		Object.assign(serverSideProps.props, ErrorPage.getInitialProps(props));

		return serverSideProps;
	}
);