import './styles.module.scss';
import NavGroup from 'components/Nav/NavGroup';
import NavItem from 'components/Nav/NavItem';
import NavMenu from 'components/Nav/NavMenu';
import Router from 'next/router';
import { signIn, signOut, useUser } from 'modules/client/users';

const visitRandomStory = () => {
	// TODO

	Router.push(`/s/${Math.random()}/p/1`);
};

const Nav = () => {
	const user = useUser();

	const notificationsBubble = 0;
	const messagesBubble = 0;

	return (
		<nav
			className={user?.settings.stickyNav ? 'sticky' : undefined}
		>
			<NavGroup id="primary">
				<NavItem id="home" label="Home" href="/" />
				{(user
					? (
						<NavMenu
							id="signed-in"
							label="My MSPFA"
							bubble={!!(notificationsBubble + messagesBubble)}
						>
							<NavItem
								id="notifications"
								label="Notifications"
								href={`/u/${user.id}/notifications`}
								bubble={notificationsBubble}
							/>
							<NavItem
								id="messages"
								label="Messages"
								href={`/u/${user.id}/messages`}
								bubble={messagesBubble}
							/>
							<div className="divider" />
							<NavItem id="stories" label="Adventures" href={`/u/${user.id}/s`} />
							<NavItem id="favorites" label="Favorites" href={`/u/${user.id}/favorites`} />
							<NavItem id="saves" label="Game Saves" href={`/u/${user.id}/saves`} />
							<div className="divider" />
							<NavItem id="profile" label="Profile" href={`/u/${user.id}`} />
							<NavItem id="settings" label="Settings" href={`/u/${user.id}/settings`} />
							<div className="divider" />
							<NavItem id="sign-out" label="Sign Out" onClick={signOut} />
						</NavMenu>
					)
					: <NavItem id="sign-in" label="Sign In" onClick={signIn} />
				)}
			</NavGroup>
			<NavGroup id="secondary">
				<NavItem id="search" label="Explore" href="/search" />
				<NavItem id="random" label="Mystery" title="Take me to a random adventure!" onClick={visitRandomStory} />
			</NavGroup>
			<NavGroup id="story">
				<NavItem id="story-log" label="Log" href={`/s/${0}/log`} />
				<NavItem id="story-search" label="Search" href={`/s/${0}/search`} />
			</NavGroup>
			<NavGroup id="more">
				<NavMenu id="help" label="Help">
					<NavItem id="help-discord" label="Discord" href="/discord" target="_blank" />
					<NavItem id="help-email" label="Email" href="mailto:support@mspfa.com" target="_blank" />
				</NavMenu>
				<NavMenu id="more" label="More">
					<NavItem id="discord" label="Discord" href="/discord" target="_blank" />
					<NavItem id="patreon" label="Patreon" href="https://www.patreon.com/mspfa" target="_blank" />
					<NavItem id="twitter" label="Twitter" href="https://twitter.com/mspfa" target="_blank" />
					<NavItem id="github" label="GitHub" href="https://github.com/MSPFA/MSPFA" target="_blank" />
				</NavMenu>
			</NavGroup>
		</nav>
	);
};

export default Nav;