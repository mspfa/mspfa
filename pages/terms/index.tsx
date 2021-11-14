import './styles.module.scss';
import Row from 'components/Row';
import Page from 'components/Page';
import Section from 'components/Section';
import type { MyGetServerSideProps } from 'lib/server/pages';
import getRandomImageFilename from 'lib/server/getRandomImageFilename';

export type ServerSideProps = {
	imageFilename: string
};

const Component = ({ imageFilename }: ServerSideProps) => (
	<Page withFlashyTitle heading="Terms of Service">
		<Section id="terms">
			<Row>
				<img
					src={`/images/terms/${imageFilename}`}
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
		</Section>
	</Page>
);

export default Component;

export const getServerSideProps: MyGetServerSideProps<ServerSideProps> = async () => ({
	props: {
		imageFilename: await getRandomImageFilename('public/images/terms')
	}
});