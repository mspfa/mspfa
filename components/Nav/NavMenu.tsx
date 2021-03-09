import NavItem from './NavItem';
import type { NavItemProps } from './NavItem';
import { useState, useCallback, useRef } from 'react';
import type { MouseEvent } from 'react';

export type NavMenuProps = {
	onBlur?: never,
	onClick?: never,
	/** The nav items in this nav menu. */
	children: JSX.Element | JSX.Element[]
} & Omit<NavItemProps, 'children' | 'forwardRef'>;

const NavMenu = ({ id, children, ...props }: NavMenuProps) => {
	const [forceOpen, setForceOpen] = useState(false);
	const anchorRef = useRef<HTMLAnchorElement>(null);
	
	return (
		<div id={`nav-menu-container-${id}`} className="nav-menu-container">
			<NavItem
				id={id}
				onBlur={
					useCallback(() => {
						setForceOpen(false);
					}, [setForceOpen])
				}
				onClick={
					useCallback((event: MouseEvent) => {
						event.preventDefault();
						if (forceOpen) {
							anchorRef.current!.blur();
						}
						setForceOpen(!forceOpen);
					}, [setForceOpen, forceOpen])
				}
				forwardRef={anchorRef}
				{...props}
			/>
			<div id={`nav-menu-${id}`} className="nav-menu">
				{children}
			</div>
		</div>
	);
};

export default NavMenu;