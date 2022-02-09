import RandomArtwork from 'components/RandomArtwork';
import Page from 'components/Page';
import type { ServerResponse } from 'http';
import BottomActions from 'components/BottomActions';
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
		{statusCode === 403 && (
			<Section>
				<RandomArtwork
					directory="403"
					name="Error 403"
					imageFilename={imageFilename!}
				>
					You don't have permission to access this page.
				</RandomArtwork>
			</Section>
		)}
		<BottomActions>
			<Button onClick={goBack}>
				Go Back
			</Button>
		</BottomActions>
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