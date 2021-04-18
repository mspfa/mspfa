import type { MyGetServerSideProps } from 'modules/server/pages';

/** Sets `res.statusCode` based on the returned `statusCode` prop. */
export const withStatusCode = <
	ServerSideProps extends Record<string, any> = {}
>(getServerSideProps: MyGetServerSideProps<ServerSideProps>): MyGetServerSideProps<ServerSideProps> => (
	async props => {
		const serverSideProps = await getServerSideProps(props);

		if (serverSideProps.props.statusCode) {
			// This ESLint comment is necessary because I'm pretty sure there's no race condition here.
			// eslint-disable-next-line require-atomic-updates
			props.res.statusCode = serverSideProps.props.statusCode;
		}

		return serverSideProps;
	}
);