import { useEffect } from 'react';
import { startLoading, stopLoading } from 'components/LoadingIndicator';

/** A component which displays the text "Loading..." and enables the `LoadingIndicator` while mounted. */
const Loading = () => {
	useEffect(() => {
		startLoading();

		return () => {
			stopLoading();
		};
	});

	return <>Loading...</>;
};

export default Loading;