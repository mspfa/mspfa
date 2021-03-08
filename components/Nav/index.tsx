import Delimit from '../Delimit';
import CandyHeart from '../CandyHeart';
import NavGroup from './NavGroup';
import NavItem from './NavItem';
import './styles.module.scss';

const Nav = () => (
	<nav>
		<Delimit with={<CandyHeart />}>
			<NavGroup id="primary">
				<NavItem id="home" label="Home" href="/" />
				<NavItem id="sign-in" label="Sign In" href="/sign-in" />
			</NavGroup>
			<NavGroup id="pages">
				<NavItem id="search" label="Site Search" href="/search" />
				<NavItem id="mystery" label="Mystery" href="/mystery" title="Take me to a random adventure!" />
			</NavGroup>
			<NavGroup id="comic">
				<NavItem id="comic-log" label="Log" href="/comics/log" />
				<NavItem id="comic-search" label="Search" href="/comics/search" />
			</NavGroup>
			<NavGroup id="external">
				<NavItem id="support" label="Help" href="#" />
				<NavItem id="links" label="More" href="#" />
			</NavGroup>
		</Delimit>
	</nav>
);

export default Nav;