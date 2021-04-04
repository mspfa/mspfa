import createGlobalState from 'global-react-state';
import './styles.module.scss';

const [useLoadingCount, setLoadingCount, getLoadingCount] = createGlobalState(0);

/**
 * Increment the count which displays the loading indicator when non-zero.
 * 
 * Returns the new value of the count.
 */
export const startLoading = (
	/** The number of things which started loading. */
	count = 1
) => {
	let loadingCount = getLoadingCount();
	setLoadingCount(loadingCount += count);
	return loadingCount;
};

/**
 * Decrement the count which displays the loading indicator when non-zero.
 * 
 * Returns the new value of the count.
 */
export const stopLoading = (
	/** The number of things which stopped loading. */
	count = 1
) => startLoading(-count);

/**
 * The component which renders the loading indicator.
 *
 * ⚠️ This should never be rendered anywhere but in the `Page` component's direct children.
 */
const LoadingIndicator = () => {
	const [loadingCount] = useLoadingCount();
	
	return (
		<div
			id="loading-indicator"
			className={loadingCount ? 'loading' : ''}
		/>
	);
};

export default LoadingIndicator;