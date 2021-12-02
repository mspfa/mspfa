import './styles.module.scss';
import { getUser, useUser } from 'lib/client/reactContexts/UserContext';
import shouldIgnoreControl from 'lib/client/shouldIgnoreControl';
import type { HTMLAttributes, ReactNode } from 'react';
import { useState, useEffect } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import defaultUserSettings from 'lib/client/defaultUserSettings';

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
	defaultOpen?: boolean,
	/** Whether this spoiler should be toggled when the control to toggle spoilers is used. */
	listenToControl?: boolean
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
	defaultOpen,
	listenToControl,
	className,
	children,
	...props
}: SpoilerProps) => {
	const user = useUser();
	const [open, setOpen] = useState(
		defaultOpen
		?? user?.settings.autoOpenSpoilers
		?? defaultUserSettings.autoOpenSpoilers
	);

	useEffect(() => {
		if (listenToControl) {
			const onKeyDown = (event: KeyboardEvent) => {
				if (shouldIgnoreControl()) {
					return;
				}

				const controls = (getUser()?.settings || defaultUserSettings).controls;

				if (event.code === controls.toggleSpoilers) {
					setOpen(open => !open);

					event.preventDefault();
				}
			};

			document.addEventListener('keydown', onKeyDown);

			return () => {
				document.removeEventListener('keydown', onKeyDown);
			};
		}
	}, [listenToControl]);

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