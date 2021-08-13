import { startLoading, stopLoading } from 'components/LoadingIndicator';

const loadedScripts: Partial<Record<string, Promise<Event>>> = {};

/**
 * Loads a script and returns a promise which is resolved with the script's `load` event or rejected with the script's `error` event.
 *
 * If this is called with the same script source multiple times, it will only attempt to load the script the first time, unless the script failed to load the previous time.
 */
const loadScript = (
	/** The source URL of the script to load. */
	source: string,
	/** A function called before the script attempts to load for the first time. */
	beforeFirstLoad?: () => void
): Promise<Event> => {
	let loadedScript = loadedScripts[source];

	if (loadedScript === undefined) {
		if (beforeFirstLoad && !(source in loadedScripts)) {
			beforeFirstLoad();
		}

		loadedScript = new Promise((resolve, reject) => {
			startLoading();

			const script = document.createElement('script');
			script.src = source;
			script.async = true;
			document.head.appendChild(script);

			script.addEventListener('load', event => {
				resolve(event);

				stopLoading();
			});

			script.addEventListener('error', event => {
				reject(event);

				// Set `loadedScripts[source]` to `undefined` to retry loading the script if this script attempts to load again.
				loadedScripts[source] = undefined;
				document.head.removeChild(script);

				stopLoading();
			});
		});

		loadedScripts[source] = loadedScript;
	}

	return loadedScript;
};

export default loadScript;