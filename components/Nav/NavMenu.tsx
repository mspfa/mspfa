import NavItem from './NavItem';
import type { NavItemProps } from './NavItem';

export type NavMenuProps = {
	/** The nav items in this nav menu. */
	children: JSX.Element | JSX.Element[]
} & Omit<NavItemProps, 'children'>;

const NavMenu = ({ id, children, ...props }: NavMenuProps) => (
	<div id={`nav-menu-container-${id}`} className="nav-menu-container">
		<NavItem id={id} {...props} />
		<div id={`nav-menu-${id}`} className="nav-menu">
			{children}
		</div>
	</div>
);

export default NavMenu;