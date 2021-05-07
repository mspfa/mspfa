import type { MyGetServerSideProps } from 'modules/server/pages';

/** Sets `res.statusCode` based on the returned `statusCode` prop. */
export const withStatusCode = <
	ServerSideProps extends Record<string, any> = {}
>(getServerSideProps: MyGetServerSideProps<ServerSideProps>): MyGetServerSideProps<ServerSideProps> => (
	async props => {
		const serverSideProps = await getServerSideProps(props);

		if (serverSideProps.props.statusCode) {
			props.res.statusCode = serverSideProps.props.statusCode;
		}

		return serverSideProps;
	}
);