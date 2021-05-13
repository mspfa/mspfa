import './styles.module.scss';
import createGlobalState from 'global-react-state';
import { sanitizeURL } from 'modules/client/utilities';
import Button from 'components/Button';
import Link from 'components/Link';
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const [useFlashMode, setFlashMode] = createGlobalState<'ask' | 'native' | 'emulate'>('ask');

const setFlashModeToNative = () => {
	setFlashMode('native');
};

let appendedEmulator = false;
let emulatorLoaded: Promise<void> | undefined;

const setFlashModeToEmulate = async () => {
	if (!appendedEmulator) {
		appendedEmulator = true;

		(window as any).RufflePlayer = {
			config: {
				polyfills: false
			}
		};

		const emulator = document.createElement('script');
		emulator.src = '/ruffle/ruffle.js';
		document.head.appendChild(emulator);

		emulatorLoaded = new Promise(resolve => {
			emulator.addEventListener('load', () => {
				resolve();
			});
		});
	}

	setFlashMode('emulate');
};

export type FlashProps = {
	src?: string,
	width?: number,
	height?: number
};

const Flash = ({
	src,
	width = 650,
	height = 450
}: FlashProps) => {
	const [flashMode] = useFlashMode();
	const [error, setError] = useState<Error | undefined>(undefined);
	const emulationRef = useRef<HTMLDivElement>(null);

	if (src) {
		src = sanitizeURL(src);
	}

	const retry = useCallback(() => {
		setError(undefined);
	}, []);

	useEffect(() => {
		if (error) {
			return;
		}

		if (!src) {
			setError(new Error('This Flash embed has no valid source URL.'));
			return;
		}

		const emulation = emulationRef.current;

		if (emulation) {
			// If `emulation` is defined, then `flashMode === 'emulate'`.

			let unmounted = false;
			let player: any;

			emulatorLoaded!.then(() => {
				if (unmounted) {
					return;
				}

				axios.head(src!).then(response => {
					if (unmounted) {
						return;
					}

					if (response.headers['content-type'] !== 'application/x-shockwave-flash') {
						setError(new Error('The requested file is not a Flash file.'));
						return;
					}

					const ruffle = (window as any).RufflePlayer.newest();
					player = ruffle.createPlayer();
					player.style.width = `${width}px`;
					player.style.height = `${height}px`;
					emulation.appendChild(player);

					player.load(src).catch(setError);
				}).catch(setError);
			});

			return () => {
				unmounted = true;

				if (player) {
					emulation.removeChild(player);
				}
			};
		}
	}, [flashMode, error, src, width, height]);

	const flashWarningFooter = src ? (
		<p className="flash-warning-footer">
			<Link href={src} download>
				Download Original Flash File
			</Link>
		</p>
	) : null;

	return (
		<div className="flash-container" style={{ width, height }}>
			{(flashMode === 'ask'
				? (
					<div className="flash-warning">
						<div className="flash-warning-content">
							<p>
								There's supposed to be a Flash embed here, but Flash is not supported.<br />
								<br />
								Would you like to automatically use <Link href="https://ruffle.rs/" target="_blank">Ruffle</Link> to emulate all Flash content during this session?
							</p>
							<p>
								<Button onClick={setFlashModeToEmulate}>
									Yes
								</Button>
								<Button onClick={setFlashModeToNative}>
									No
								</Button>
							</p>
							<p>
								Warning: The emulator is still in development and will not always work, especially with ActionScript 3. You can always refresh the page to disable it again.
							</p>
						</div>
						{flashWarningFooter}
					</div>
				)
				: flashMode === 'native'
					? (
						<object
							type="application/x-shockwave-flash"
							data={src}
							width={width}
							height={height}
						/>
					)
					: error
						? (
							<div className="flash-warning" style={{ width, height }}>
								<div className="flash-warning-content">
									<p>
										An error occurred while trying to load the player:
									</p>
									<p className="red">
										{error.toString()}
									</p>
									<p>
										<Button onClick={retry}>
											Retry
										</Button>
									</p>
								</div>
								{flashWarningFooter}
							</div>
						)
						: <div className="flash-emulation" ref={emulationRef} />
			)}
		</div>
	);
};

export default Flash;