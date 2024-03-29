import './styles.module.scss';
import sanitizeURL from 'lib/client/sanitizeURL';
import Button from 'components/Button';
import Link from 'components/Link';
import { useEffect, useRef, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import axios from 'axios';
import loadScript from 'lib/client/loadScript';
import Row from 'components/Row';
import { startLoading, stopLoading } from 'components/LoadingIndicator';

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
	const [error, setError] = useState<string | Error>();
	const contentRef = useRef<HTMLDivElement>(null);

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
			setError('This Flash embed has no valid source URL.');
			return;
		}

		const content = contentRef.current;
		if (!content) {
			return;
		}

		let mounted = true;
		let player: any;

		loadScript('https://unpkg.com/@ruffle-rs/ruffle', () => {
			(window as any).RufflePlayer = {
				config: {
					polyfills: false,
					showSwfDownload: true,
					warnOnUnsupportedContent: false,
					preloader: false
				}
			};
		}).then(() => {
			if (!mounted) {
				return;
			}

			startLoading();

			axios.head(src!).then(response => {
				if (!mounted) {
					return;
				}

				if (response.headers['content-type'] !== 'application/x-shockwave-flash') {
					setError('The requested file is not a Flash file.');
					return;
				}

				const ruffle = (window as any).RufflePlayer.newest();
				player = ruffle.createPlayer();
				content.appendChild(player);

				return player.load(src).then(() => {
					// This is a workaround for https://github.com/ruffle-rs/ruffle/issues/9233.
					if (!mounted) {
						player.destroy();
					}
				});
			}).catch(setError).finally(() => {
				stopLoading();
			});
		}).catch(() => {
			setError('The emulator script failed to load.');
		});

		return () => {
			mounted = false;

			if (player) {
				content.removeChild(player);
			}
		};
	}, [error, src]);

	return (
		<div
			className="flash-container"
			style={{ width }}
		>
			<div
				className="flash"
				// These data attributes are just here for convenience in browser's dev tools.
				data-src={src}
				data-width={width}
				data-height={height}
				style={{
					// Enforce the correct aspect ratio.
					paddingBottom: (100 * height / width) + '%'
				}}
			>
				{error ? (
					<div className="flash-placeholder">
						<div className="flash-placeholder-content">
							<Row>
								An error occurred while trying to load the Flash player:
							</Row>
							<Row className="red">
								{error.toString()}
							</Row>
							<Row>
								<Button autoFocus onClick={retry}>
									Retry
								</Button>
							</Row>
						</div>
						{src && (
							<Row className="flash-placeholder-footer">
								<Link
									href={src}
									download
									// Open in new tab in case the link goes to a page and not a download.
									target="_blank"
								>
									Download Original Flash File
								</Link>
							</Row>
						)}
					</div>
				) : (
					<div className="flash-content" ref={contentRef} />
				)}
			</div>
		</div>
	);
};

export default Flash;
