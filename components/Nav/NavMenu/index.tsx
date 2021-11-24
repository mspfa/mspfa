import './styles.module.scss';
import NavItem from 'components/Nav/NavItem';
import type { NavItemProps } from 'components/Nav/NavItem';
import React, { useState, useRef } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';

export type NavMenuProps = {
	onBlur?: never,
	onClick?: never,
	/** The nav items in this nav menu. */
	children: JSX.Element | JSX.Element[]
} & Omit<NavItemProps, 'href' | 'children'>;

const NavMenu = ({ id, children, ...props }: NavMenuProps) => {
	// This state is whether the menu's label is in focus due to being clicked.
	const [focusFromClick, setFocusFromClick] = useState(false);

	/** A ref to the underlying link element of this menu's label. */
	const labelRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null!);

	return (
		<div
			id={`nav-menu-container-${id}`}
			className="nav-menu-container"
		>
			{/* The menu's label. */}
			<NavItem
				id={id}
				{...props}
				onBlur={
					useFunction(() => {
						setFocusFromClick(false);
					})
				}
				onClick={
					useFunction(() => {
						// We must check whether the focus is from being clicked rather than checking for any focus, because a normal focus check will succeed even if it wasn't focused before being clicked. Elements receive focus on mouse down, which is before the click event is fired on mouse up.
						if (focusFromClick) {
							// If the label is already clicked and the user clicks it again, it should toggle its focus off.
							labelRef.current.blur();
						} else {
							// Now that the element is in focus and was clicked for the first time, toggle on `focusFromClick`.
							setFocusFromClick(true);
						}
					})
				}
				ref={labelRef}
			/>
			<div
				id={`nav-menu-${id}`}
				className="nav-menu"
			>
				{children}
			</div>
		</div>
	);
};

export default NavMenu;