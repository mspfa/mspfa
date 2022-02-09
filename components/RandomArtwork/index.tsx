import './styles.module.scss';
import Row from 'components/Row';
import type { ReactNode } from 'react';

export type RandomArtworkProps = {
	/**
	 * The name of the directory in `/images` containing the image files to randomize between.
	 *
	 * Example: `'error-403'`
	 */
	directory: string,
	/**
	 * What this artwork is for.
	 *
	 * Example: `'Error 403'`
	 */
	name: string,
	/**
	 * The filename of the image.
	 *
	 * Examples: `Cool Guy 43.png`, `'Cool Guy 43.2.png'`
	 */
	imageFilename: string,
	/** Content to put immediately following the `img` tag. */
	afterImage?: ReactNode,
	/** Content to put in a centered row below the artwork. */
	children?: ReactNode
};

const RandomArtwork = ({
	directory,
	name,
	imageFilename,
	afterImage,
	children
}: RandomArtworkProps) => (
	<>
		<Row className="random-artwork-row random-artwork-image-container">
			<img
				src={`/images/${directory}/${imageFilename}`}
				alt={`Artwork for ${name}`}
				title={`Artist: ${imageFilename.slice(0, imageFilename.indexOf('.'))}`}
			/>
			{afterImage}
		</Row>
		{children !== undefined && (
			<Row className="random-artwork-row">
				{children}
			</Row>
		)}
	</>
);

export default RandomArtwork;