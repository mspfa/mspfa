import NavItem from 'components/Nav/NavItem';
import type { NavItemProps } from 'components/Nav/NavItem';
import React, { useState, useCallback, useRef } from 'react';
import type { MouseEvent } from 'react';

export type NavMenuProps = {
	onFocus?: never,
	onBlur?: never,
	onClick?: never,
	/** The nav items in this nav menu. */
	children: JSX.Element | JSX.Element[]
} & Omit<NavItemProps, 'href' | 'children'>;

const NavMenu = ({ id, children, ...props }: NavMenuProps) => {
	// This state is whether the menu's label is in focus due to being clicked.
	const [clickedLabel, setClickedLabel] = useState(false);

	// This state is whether the menu container should have the `force-open` class, which forces it to be visible.
	// Note: The menu can still be visible without the `force-open` class, for example if it or its label is hovered over.
	const [forceOpen, setForceOpen] = useState(false);

	/** A ref to the underlying link element of this menu's label. */
	const labelRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null!);
	const menuContainerRef = useRef<HTMLDivElement>(null!);

	/** Handles the focus event on the menu's label or any link in the menu. */
	const onFocus = useCallback(() => {
		// When the menu's label or any link in the menu is focused, add the `force-open` class to the menu container.
		setForceOpen(true);
	}, []);

	/** Handles the blur event on the menu's label or any link in the menu. */
	const onBlur = useCallback(() => {
		// `setTimeout` is necessary here because otherwise, for example when tabbing through links in the menu, this will run before the next link in the menu focuses, so the `if` statement would not detect that the menu is in focus.
		setTimeout(() => {
			if (
				// Check if the focused element is the menu's label.
				document.activeElement !== labelRef.current
				// Check if the focused element is a link in the menu container.
				&& !menuContainerRef.current.contains(document.activeElement)
			) {
				// If no part of the menu is in focus, remove the `force-open` class.
				setForceOpen(false);
			}
		});
	}, []);

	/** Sets array `key`s and adds `onFocus={onFocus}` and `onBlur={onBlur}` props to the links in the menu. */
	const processChild = (child: JSX.Element, index: number) => (
		React.cloneElement(child, {
			key: child.props.id || index,
			// Only add the event listeners if this item is a component (e.g. `NavItem`) rather than an element.
			...typeof child.type !== 'string' && {
				onFocus,
				onBlur
			}
		})
	);

	return (
		<div
			id={`nav-menu-container-${id}`}
			className={`nav-menu-container${forceOpen ? ' force-open' : ''}`}
			ref={menuContainerRef}
		>
			{/* The menu's label. */}
			<NavItem
				id={id}
				{...props}
				onFocus={onFocus}
				onBlur={
					useCallback(() => {
						onBlur();

						// When the menu's label is blurred, it is (obviously) no longer focused from being clicked.
						setClickedLabel(false);

						// This ESLint comment is necessary because the rule thinks `onBlur` should be a dependency here. It shouldn't because it is memoized in its definition with no dependencies and thus can never change.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}, [])
				}
				onClick={
					useCallback((event: MouseEvent) => {
						event.preventDefault();
						if (clickedLabel) {
							// If the label is already clicked and the user clicks it again, it should toggle its focus off, allowing the menu to be hidden.
							labelRef.current.blur();
						}
						// When the user clicks the label, toggle whether it is clicked.
						setClickedLabel(!clickedLabel);
					}, [clickedLabel])
				}
				ref={labelRef}
			/>
			<div
				id={`nav-menu-${id}`}
				className="nav-menu"
			>
				{Array.isArray(children) ? children.map(processChild) : processChild(children, 0)}
			</div>
		</div>
	);
};

export default NavMenu;