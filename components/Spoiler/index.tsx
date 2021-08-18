import './styles.module.scss';
import { defaultSettings, getUser, useUser } from 'lib/client/users';
import shouldIgnoreControl from 'lib/client/shouldIgnoreControl';
import type { HTMLAttributes, ReactNode } from 'react';
import { useState, useEffect } from 'react';
import useFunction from 'lib/client/useFunction';

export type SpoilerProps = HTMLAttributes<HTMLDivElement> & {
	/** The spoiler button's label after "Show" or "Hide". Defaults to `'Spoiler'`. */
	name?: ReactNode,
	/**
	 * The spoiler button's label when the spoiler is closed. Defaults to ```
	 * `Show ${name}`
	 * ```.
	 */
	show?: ReactNode,
	/**
	 * The spoiler button's label when the spoiler is open. Defaults to ```
	 * `Hide ${name}`
	 * ```.
	 */
	hide?: ReactNode,
	/** Whether the spoiler is initially open. Defaults to the user's `autoOpenSpoilers` setting. */
	initialOpen?: boolean
};

const Spoiler = ({
	name = 'Spoiler',
	show: showLabel = `Show ${name}`,
	hide: hideLabel = `Hide ${name}`,
	initialOpen,
	className,
	children,
	...props
}: SpoilerProps) => {
	const user = useUser();
	const [open, setOpen] = useState(
		initialOpen
		?? user?.settings.autoOpenSpoilers
		?? defaultSettings.autoOpenSpoilers
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (shouldIgnoreControl()) {
				return;
			}

			const controls = (getUser()?.settings || defaultSettings).controls;

			if (event.code === controls.toggleSpoilers) {
				setOpen(open => !open);

				event.preventDefault();
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, []);

	return (
		<div
			className={`spoiler${open ? ' open' : ' closed'}${className ? ` ${className}` : ''}`}
			{...props}
		>
			<div className="spoiler-heading">
				<button
					type="button"
					onClick={
						useFunction(() => {
							setOpen(open => !open);
						})
					}
				>
					{open ? hideLabel : showLabel}
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