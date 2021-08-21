import './styles.module.scss';
import { defaultSettings, getUser, useUser } from 'lib/client/users';
import shouldIgnoreControl from 'lib/client/shouldIgnoreControl';
import type { HTMLAttributes, ReactNode } from 'react';
import { useState, useEffect } from 'react';
import useFunction from 'lib/client/useFunction';

export type SpoilerProps = HTMLAttributes<HTMLDivElement> & {
	/** The spoiler button's label inserted after "Show" or "Hide". */
	name?: ReactNode,
	/**
	 * The spoiler button's label when the spoiler is closed.
	 *
	 * Defaults to (effectively) `<>Show {name}</>`, or `'Show'` if `name` is undefined.
	 */
	show?: ReactNode,
	/**
	 * The spoiler button's label when the spoiler is open.
	 *
	 * Defaults to (effectively) `<>Hide {name}</>`, or `'Hide'` if `name` is undefined.
	 */
	hide?: ReactNode,
	/** Whether the spoiler is initially open. Defaults to the user's `autoOpenSpoilers` setting. */
	initialOpen?: boolean
};

const Spoiler = ({
	name,
	show: showLabel = (
		typeof name === 'string'
			// Use a string to avoid generating HTML comments.
			? `Show ${name}`
			: name
				? <>Show {name}</>
				: 'Show'
	),
	hide: hideLabel = (
		typeof name === 'string'
			// Use a string to avoid generating HTML comments.
			? `Hide ${name}`
			: name
				? <>Hide {name}</>
				: 'Hide'
	),
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