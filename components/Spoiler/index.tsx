import './styles.module.scss';
import { defaultSettings, getUser, useUser } from 'modules/client/users';
import { shouldIgnoreControl } from 'modules/client/utilities';
import type { ReactNode } from 'react';
import { useState, useCallback, useEffect } from 'react';

export type SpoilerProps = {
	/** The spoiler button's label when clicking it opens the spoiler. */
	open?: ReactNode,
	/** The spoiler button's label when clicking it closes the spoiler. */
	close?: ReactNode,
	respectAutoOpenSpoilersSetting?: boolean,
	children?: ReactNode
};

const Spoiler = ({
	open: openLabel = 'Show',
	close: closeLabel = 'Hide',
	respectAutoOpenSpoilersSetting,
	children
}: SpoilerProps) => {
	const user = useUser();
	const [open, setOpen] = useState(
		respectAutoOpenSpoilersSetting
			? user?.settings.autoOpenSpoilers ?? defaultSettings.autoOpenSpoilers
			: false
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (shouldIgnoreControl()) {
				return;
			}

			if (event.code === (getUser()?.settings.controls.toggleSpoilers ?? defaultSettings.controls.toggleSpoilers)) {
				event.preventDefault();

				setOpen(open => !open);
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, []);

	return (
		<div
			className={`spoiler${open ? ' open' : ' closed'}`}
		>
			<div className="spoiler-heading">
				<button
					type="button"
					onClick={
						useCallback(() => {
							setOpen(open => !open);
						}, [])
					}
				>
					{open ? closeLabel : openLabel}
				</button>
			</div>
			{open && (
				<div className="spoiler-content">
					{children}
				</div>
			)}
		</div>
	);
};

export default Spoiler;