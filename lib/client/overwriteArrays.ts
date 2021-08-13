/** A customizer for Lodash's `mergeWith` which merges normally except overwrites arrays. */
const overwriteArrays = (objectValue: any, sourceValue: any) => {
	if (Array.isArray(objectValue)) {
		return sourceValue;
	}
};

export default overwriteArrays;