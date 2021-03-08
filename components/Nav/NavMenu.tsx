import NavItem from './NavItem';
import type { NavItemProps } from './NavItem';
import { useState, useCallback } from 'react';

export type NavMenuProps = {
	onPointerEnter?: never,
	onPointerLeave?: never,
	onFocus?: never,
	onBlur?: never,
	/** The nav items in this nav menu. */
	children: JSX.Element | JSX.Element[]
} & Omit<NavItemProps, 'children'>;

const NavMenu = ({ id, children, ...props }: NavMenuProps) => {
	const [forceOpen, setForceOpen] = useState(false);
	
	const enableForceOpen = useCallback(() => {
		setForceOpen(true);
	}, [setForceOpen]);
	const disableForceOpen = useCallback(() => {
		setForceOpen(false);
	}, [setForceOpen]);
	
	return (
		<>
			<div id={`nav-menu-${id}`} className={`nav-menu${forceOpen ? ' force-open' : ''}`}>
				{children}
			</div>
			<NavItem
				id={id}
				onClick={enableForceOpen}
				onPointerEnter={enableForceOpen}
				onPointerLeave={disableForceOpen}
				onFocus={enableForceOpen}
				onBlur={disableForceOpen} // TODO: This may be problematic on touch screens. Needs testing.
				{...props}
			/>
		</>
	);
};

export default NavMenu;