import './styles.module.scss';
import Box from 'components/Box';
import Row from 'components/Row';
import Page from 'components/Page';
import type { ServerResponse } from 'http';
import fs from 'fs-extra';
import path from 'path';
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
		<Box id="error-box">
			{statusCode === 403 && (
				<BoxSection>
					<Row>
						<img
							src={`/images/403/${imageFilename!}`}
							width={650}
							height={450}
							alt="Artwork for Error 403"
							title={`Artist: ${imageFilename!.slice(0, imageFilename!.indexOf('.'))}`}
						/>
					</Row>
					<Row>You don't have permission to access this page.</Row>
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
const imageFilenames = (
	fs.readdirSync(
		path.join(process.cwd(), 'public/images/403')
	)
).filter(filename => /\.(?:png|gif)$/i.test(filename));
// @server-only }

// Pass the status code from Next to `ErrorPage`'s props.
ErrorPage.getInitialProps = ({ res, error }: {
	res?: ServerResponse,
	error?: any
}): ErrorPageProps => {
	const statusCode: number = res?.statusCode || error?.statusCode || 404;

	return statusCode === 403 ? {
		statusCode: 403,
		imageFilename: imageFilenames[Math.floor(Math.random() * imageFilenames.length)]
	} : {
		statusCode
	};
};

export default ErrorPage;