import Box from 'components/Box';
import BoxRow from 'components/Box/BoxRow';
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
			<BoxSection>
				<BoxRow>
					<img
						src={`/images/terms/${imageFilename}`}
						alt="Artwork for Terms of Service"
						title={`Artist: ${imageFilename.slice(0, imageFilename.indexOf('.'))}`}
					/>
				</BoxRow>
				<BoxRow>
					<p>
						[ Terms of service here ]
					</p>
				</BoxRow>
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