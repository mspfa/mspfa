import fs from 'fs-extra';
import path from 'path';

/** A record mapping the path string of each directory to an array of filename strings of the images in the directory. */
const directories: Record<string, string[]> = {};

/** Gets the filename of a random image from the specified directory. */
const getRandomImageFilename = async (
	/**
	 * The path to pick the random image from, relative to the current working directory.
	 *
	 * Example: `'public/images/403'`
	 */
	directoryPath: string
) => {
	if (!(directoryPath in directories)) {
		directories[directoryPath] = (
			await fs.readdir(
				path.join(process.cwd(), directoryPath)
			)
		).filter(filename => /\.(?:png|gif)$/i.test(filename));
	}

	const imageFilenames = directories[directoryPath];
	return imageFilenames[Math.floor(Math.random() * imageFilenames.length)];
};

export default getRandomImageFilename;