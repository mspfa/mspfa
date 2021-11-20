/** Returns the same color code as the one inputted, but adds a leading hash if it's a hex color code missing one. */
const addHashToColor = (color: string) => (
	color.replace(/^([0-9a-f]{3}(?:[0-9a-f]{3}(?:[0-9a-f]{2})?)?)$/i, '#$1')
);

export default addHashToColor;