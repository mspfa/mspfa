import './styles.module.scss';
import NavGroup from 'components/Nav/NavGroup';
import NavItem from 'components/Nav/NavItem';
import NavMenu from 'components/Nav/NavMenu';
import Router, { useRouter } from 'next/router';
import { promptSignIn, promptSignOut, useUser } from 'lib/client/users';
import createGlobalState from 'global-react-state';
import type { StoryID } from 'lib/server/stories';
import { useIsomorphicLayoutEffect } from 'react-use';
import useSticky from 'lib/client/useSticky';
import { useRef } from 'react';

const [useStoryID, setStoryID] = createGlobalState<StoryID | undefined>(undefined);

/** A hook which sets the nav bar's story ID (adding the "LOGS" and "SEARCH" nav items) as long as the component is mounted. */
export const useNavStoryID = (storyID: StoryID) => {
	// This hook is a layout effect hook rather than a normal effect hook so the nav bar is updated immediately, preventing the user from briefly seeing the outdated nav bar.
	useIsomorphicLayoutEffect(() => {
		setStoryID(storyID);

		return () => {
			setStoryID(undefined);
		};
	}, [storyID]);
};

const visitRandomStory = () => {
	// TODO: Visit random story.

	Router.push(`/?s=${Math.random()}&p=1`);
};

const Nav = () => {
	const router = useRouter();
	const user = useUser();
	const [storyID] = useStoryID();

	const notificationsBubble = 0;
	let messagesBubble = 0;

	if (user) {
		messagesBubble = (
			router.pathname === '/user/[userID]/messages'
				? 0
				: user.unreadMessageCount
		);
	}

	const ref = useRef<HTMLElement>(null!);
	useSticky(ref);

	return (
		<nav
			className={user?.settings.stickyNav ? 'sticky' : undefined}
			ref={ref}
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
								href={`/user/${user.id}/notifications`}
								bubble={notificationsBubble}
							/>
							<NavItem
								id="messages"
								label="Messages"
								href={`/user/${user.id}/messages`}
								bubble={messagesBubble}
							/>
							<div className="divider" />
							<NavItem id="stories" label="Adventures" href={`/user/${user.id}/s`} />
							<NavItem id="favs" label="Favorites" href={`/user/${user.id}/favs`} />
							<NavItem id="saves" label="Game Saves" href={`/user/${user.id}/saves`} />
							<div className="divider" />
							<NavItem id="profile" label="Profile" href={`/user/${user.id}`} />
							<NavItem id="settings" label="Settings" href={`/user/${user.id}/settings`} />
							<div className="divider" />
							<NavItem id="sign-out" label="Sign Out" onClick={promptSignOut} />
						</NavMenu>
					)
					: <NavItem id="sign-in" label="Sign In" onClick={promptSignIn} />
				)}
			</NavGroup>
			<NavGroup id="secondary">
				<NavItem id="search" label="Explore" href="/search" />
				<NavItem id="random" label="Mystery" title="Take me to a random adventure!" onClick={visitRandomStory} />
			</NavGroup>
			{storyID !== undefined && (
				<NavGroup id="story">
					<NavItem
						id="story-log"
						label="Log"
						href={`/s/${storyID}/log${'preview' in router.query ? '?preview=1' : ''}`}
					/>
					<NavItem
						id="story-search"
						label="Search"
						href={`/s/${storyID}/search${'preview' in router.query ? '?preview=1' : ''}`}
					/>
				</NavGroup>
			)}
			<NavGroup id="external">
				{/** Since these are all external links, they should all have `target="_blank"`, since the user's intention with them is generally not going to be to leave the site. */}
				<NavItem id="discord" label="Discord" href="/discord" target="_blank" />
				<NavMenu id="help" label="Help">
					<NavItem id="help-discord" label="Ask on Discord" href="/discord" target="_blank" />
					<NavItem id="support-email" label="Support Email" href="mailto:support@mspfa.com" target="_blank" />
				</NavMenu>
				<NavMenu id="more" label="More">
					<NavItem id="patreon" label="Patreon" href="https://www.patreon.com/mspfa" target="_blank" />
					<NavItem id="twitter" label="Twitter" href="https://twitter.com/mspfa" target="_blank" />
					<NavItem id="github" label="GitHub" href="https://github.com/MSPFA/MSPFA" target="_blank" />
				</NavMenu>
			</NavGroup>
			<NavGroup id="boring">
				<NavItem id="rules" label="Rules" href="/rules" />
				<NavMenu id="legal" label="Legal">
					<NavItem id="privacy" label="Privacy Policy" href="/privacy" />
					<NavItem id="terms" label="Terms of Service" href="/terms" />
				</NavMenu>
			</NavGroup>
		</nav>
	);
};

export default Nav;