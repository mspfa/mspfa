import Delimit from '../Delimit';
import CandyHeart from '../CandyHeart';
import NavGroup from './NavGroup';
import NavItem from './NavItem';
import NavMenu from './NavMenu';
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
				<NavMenu id="help" label="Help">
					<NavItem id="help-discord" label="Discord" href="/discord" target="_blank" />
					<NavItem id="help-email" label="Email" href="mailto:support@mspfa.com" target="_blank" />
				</NavMenu>
				<NavMenu id="links" label="More">
					<NavItem id="discord" label="Discord" href="/discord" target="_blank" />
					<NavItem id="patreon" label="Patreon" href="https://www.patreon.com/mspfa" target="_blank" />
					<NavItem id="twitter" label="Twitter" href="https://twitter.com/mspfa" target="_blank" />
					<NavItem id="github" label="GitHub" href="https://github.com/GrantGryczan/MSPFA" target="_blank" />
				</NavMenu>
			</NavGroup>
		</Delimit>
	</nav>
);

export default Nav;