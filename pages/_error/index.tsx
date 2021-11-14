import './styles.module.scss';
import Box from 'components/Box';
import Row from 'components/Row';
import Page from 'components/Page';
import type { ServerResponse } from 'http';
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import Router from 'next/router';
import Section from 'components/Section';
import type { integer } from 'lib/types';
import getRandomImageFilename from 'lib/server/getRandomImageFilename'; // @server-only

const goBack = () => {
	const { asPath } = Router;

	Router.back();

	if (Router.asPath === asPath) {
		Router.push('/');
	}
};

export type ErrorPageProps = {
	statusCode: integer,
	imageFilename?: never
} | {
	statusCode: 403,
	imageFilename: string
};

const ErrorPage = ({ statusCode, imageFilename }: ErrorPageProps) => (
	<Page withFlashyTitle heading={`Error ${statusCode}`}>
		<Box id="error-box">
			{statusCode === 403 && (
				<Section>
					<Row>
						<img
							src={`/images/403/${imageFilename!}`}
							alt="Artwork for Error 403"
							title={`Artist: ${imageFilename!.slice(0, imageFilename!.indexOf('.'))}`}
						/>
					</Row>
					<Row>You don't have permission to access this page.</Row>
				</Section>
			)}
			<BoxFooter>
				<Button onClick={goBack}>
					Go Back
				</Button>
			</BoxFooter>
		</Box>
	</Page>
);

// Pass the status code from Next to `ErrorPage`'s props.
// Even if this function is only called server-side, it must still exist client-side so the Next client knows `ErrorPage` has initial props.
ErrorPage.getInitialProps = async ({ res, error }: {
	res?: ServerResponse,
	error?: any
}): Promise<ErrorPageProps> => {
	const statusCode: integer = res?.statusCode || error?.statusCode || 404;

	return statusCode === 403 ? {
		statusCode: 403,
		imageFilename: await getRandomImageFilename('public/images/403')
	} : {
		statusCode
	};
};

export default ErrorPage;