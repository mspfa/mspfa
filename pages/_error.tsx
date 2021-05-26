import Box from 'components/Box';
import BoxRow from 'components/Box/BoxRow';
import Page from 'components/Page';
import type { ServerResponse } from 'http';
import fs from 'fs-extra'; // @server-only
import path from 'path'; // @server-only
import BoxFooter from 'components/Box/BoxFooter';
import Button from 'components/Button';
import { useCallback } from 'react';
import Router from 'next/router';
import BoxSection from 'components/Box/BoxSection';

export type ErrorPageProps = {
	statusCode: number,
	imageFilename?: never
} | {
	statusCode: 403,
	imageFilename: string
};

const ErrorPage = ({ statusCode, imageFilename }: ErrorPageProps) => (
	<Page flashyTitle heading={`Error ${statusCode}`}>
		<Box>
			{statusCode === 403 && (
				<BoxSection>
					<BoxRow>
						<img
							src={`/images/403/${imageFilename!}`}
							alt="Artwork for Error 403"
							title={`Artist: ${imageFilename!.slice(0, imageFilename!.indexOf('.'))}`}
						/>
					</BoxRow>
					<BoxRow>
						<p>
							You don't have permission to access this page.
						</p>
					</BoxRow>
				</BoxSection>
			)}
			<BoxFooter>
				<Button
					onClick={
						useCallback(() => {
							const { asPath } = Router;

							Router.back();

							if (Router.asPath === asPath) {
								Router.push('/');
							}
						}, [])
					}
				>
					Go Back
				</Button>
			</BoxFooter>
		</Box>
	</Page>
);

// @server-only {
/** The array of 403 image filenames. */
const error403Images = (fs.readdirSync(
	path.join(process.cwd(), 'public/images/403')
)).filter(filename => /\.(?:png|gif)$/i.test(filename));
// @server-only }

// Pass the status code from Next to `ErrorPage`'s props.
ErrorPage.getInitialProps = ({ res, error }: {
	res?: ServerResponse,
	error?: any
}): ErrorPageProps => {
	const statusCode: number = res?.statusCode || error?.statusCode || 404;

	return statusCode === 403 ? {
		statusCode: 403,
		imageFilename: error403Images[Math.floor(Math.random() * error403Images.length)]
	} : {
		statusCode
	};
};

export default ErrorPage;