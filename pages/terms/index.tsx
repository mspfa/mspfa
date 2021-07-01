import './styles.module.scss';
import Box from 'components/Box';
import Row from 'components/Row';
import Page from 'components/Page';
import fs from 'fs-extra';
import path from 'path';
import BoxSection from 'components/Box/BoxSection';
import type { MyGetServerSideProps } from 'modules/server/pages';

export type ServerSideProps = {
	imageFilename: string
};

const Component = ({ imageFilename }: ServerSideProps) => (
	<Page flashyTitle heading="Terms of Service">
		<Box>
			<BoxSection id="terms">
				<Row>
					<img
						src={`/images/terms/${imageFilename}`}
						width={650}
						height={450}
						alt="Artwork for Terms of Service"
						title={`Artist: ${imageFilename.slice(0, imageFilename.indexOf('.'))}`}
					/>
					<div id="art-disclaimer">
						Disclaimer: This image is not part of and has no effect related to the terms of service.
					</div>
				</Row>
				<Row>
					<p>
						[ Terms of service here ]
					</p>
				</Row>
			</BoxSection>
		</Box>
	</Page>
);

export default Component;

// @server-only {
const imageFilenames = (
	fs.readdirSync(
		path.join(process.cwd(), 'public/images/terms')
	)
).filter(filename => /\.(?:png|gif)$/i.test(filename));
// @server-only }

export const getServerSideProps: MyGetServerSideProps<ServerSideProps> = async () => ({
	props: {
		imageFilename: imageFilenames[Math.floor(Math.random() * imageFilenames.length)]
	}
});