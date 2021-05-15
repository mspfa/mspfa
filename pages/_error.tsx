import Box from 'components/Box';
import BoxRow from 'components/Box/BoxRow';
import BoxSection from 'components/Box/BoxSection';
import Page from 'components/Page';
import type { ServerResponse } from 'http';

export type ErrorPageProps = { statusCode?: number };

const ErrorPage = ({ statusCode = 404 }: ErrorPageProps) => (
	<Page flashyTitle heading={`Error ${statusCode}`}>
		<Box>
			<BoxSection>
				<BoxRow>
					<div
						style={{
							display: 'inline-flex',
							boxSizing: 'border-box',
							border: '1px dashed #808080',
							width: 650,
							height: 450,
							justifyContent: 'center',
							alignItems: 'center'
						}}
					>
						YOUR ARTWORK HERE
					</div>
				</BoxRow>
				<BoxRow>
					<p>
						You don't have permission to access this page.
					</p>
				</BoxRow>
			</BoxSection>
		</Box>
	</Page>
);

// Pass the status code from Next to `ErrorPage`'s props.
ErrorPage.getInitialProps = ({ res, error }: {
	res?: ServerResponse,
	error?: any
}) => ({
	statusCode: res?.statusCode || error?.statusCode
});

export default ErrorPage;