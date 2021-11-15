import './styles.module.scss';
import createGlobalState from 'global-react-state';
import sanitizeURL from 'lib/client/sanitizeURL';
import Button from 'components/Button';
import Link from 'components/Link';
import { useEffect, useRef, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import axios from 'axios';
import loadScript from 'lib/client/loadScript';

const [useFlashMode, setFlashMode] = createGlobalState<'ask' | 'native' | 'emulate'>('ask');

const setFlashModeToNative = () => {
	setFlashMode('native');
};

const setFlashModeToEmulate = async () => {
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
	const [error, setError] = useState<Error>();
	const emulationRef = useRef<HTMLDivElement>(null);

	if (src) {
		src = sanitizeURL(src);
	}

	const retry = useFunction(() => {
		setError(undefined);
	});

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

			loadScript('/ruffle/ruffle.js', () => {
				(window as any).RufflePlayer = {
					config: {
						polyfills: false
					}
				};
			}).then(() => {
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
			}).catch(() => {
				setError(new Error('The emulator script failed to load.'));
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