import './styles.module.scss';
import NavGroup from 'components/Nav/NavGroup';
import NavItem from 'components/Nav/NavItem';
import NavMenu from 'components/Nav/NavMenu';
import Router, { useRouter } from 'next/router';
import { setUser, useUser } from 'lib/client/reactContexts/UserContext';
import useSticky from 'lib/client/reactHooks/useSticky';
import { useContext, useRef } from 'react';
import StoryIDContext from 'lib/client/reactContexts/StoryIDContext';
import PreviewModeContext from 'lib/client/reactContexts/PreviewModeContext';
import Dialog from 'lib/client/Dialog';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import promptSignIn from 'lib/client/promptSignIn';

type SessionAPI = APIClient<typeof import('pages/api/session').default>;

/** Opens a dialog prompting the user to sign out. */
export const promptSignOut = async () => {
	if (await Dialog.confirm({
		id: 'sign-out',
		title: 'Sign Out',
		content: 'Are you sure you want to sign out?'
	})) {
		await (api as SessionAPI).delete('session');
		setUser(undefined);
	}
};

const visitRandomStory = () => {
	// TODO: Visit random story.

	Router.push(`/?s=${Math.random()}&p=1`);
};

const Nav = () => {
	const router = useRouter();

	const user = useUser();

	const notificationsBubble = 0;
	let messagesBubble = 0;

	if (user) {
		messagesBubble = (
			router.pathname === '/users/[userID]/messages'
				? 0
				: user.unreadMessageCount
		);
	}

	const ref = useRef<HTMLElement>(null!);
	useSticky(ref);

	const storyID = useContext(StoryIDContext);
	const previewMode = useContext(PreviewModeContext);

	return (
		<nav
			className={user?.settings.stickyNav ? 'sticky' : undefined}
			ref={ref}
		>
			<NavGroup id="primary">
				<NavItem id="home" label="Home" href="/" />
				{user ? (
					<NavMenu
						id="signed-in"
						label="My MSPFA"
						bubble={notificationsBubble + messagesBubble !== 0}
					>
						<NavItem
							id="notifications"
							label="Notifications"
							href={`/users/${user.id}/notifications`}
							bubble={notificationsBubble}
						/>
						<NavItem
							id="messages"
							label="Messages"
							href={`/users/${user.id}/messages`}
							bubble={messagesBubble}
						/>
						<div className="divider" />
						<NavItem id="stories" label="Adventures" href={`/users/${user.id}/stories`} />
						<NavItem id="favs" label="Favorites" href={`/users/${user.id}/favs`} />
						<NavItem id="saves" label="Game Saves" href={`/users/${user.id}/saves`} />
						<div className="divider" />
						<NavItem id="profile" label="Profile" href={`/users/${user.id}`} />
						<NavItem id="settings" label="Settings" href={`/users/${user.id}/settings`} />
						<div className="divider" />
						<NavItem id="sign-out" label="Sign Out" onClick={promptSignOut} />
					</NavMenu>
				) : (
					<NavItem id="sign-in" label="Sign In" onClick={promptSignIn} />
				)}
			</NavGroup>
			<NavGroup id="secondary">
				<NavMenu id="browse" label="Browse">
					<NavItem id="browse-stories" label="Adventures" href="/browse/stories" />
					<NavItem id="browse-users" label="Users" href="/browse/users" />
					<div className="divider" />
					<NavItem id="browse-modules" label="Modules" href="/browse/modules" />
				</NavMenu>
				<NavItem id="random-story" label="Mystery" title="Take me to a random adventure!" onClick={visitRandomStory} />
			</NavGroup>
			{storyID !== undefined && (
				<NavGroup id="story">
					<NavItem
						id="story-log"
						label="Log"
						href={`/stories/${storyID}/log${previewMode ? '?preview=1' : ''}`}
					/>
					<NavItem
						id="story-search"
						label="Search"
						href={`/stories/${storyID}/search${previewMode ? '?preview=1' : ''}`}
					/>
				</NavGroup>
			)}
			<NavGroup id="external">
				{/* Since these are all external links, they should all have `target="_blank"`, since the user's intention with them is generally not going to be to leave the site. */}
				<NavMenu id="support" label="Support">
					<NavItem id="support-discord" label="Ask on Discord" href="/discord" target="_blank" />
					<NavItem id="support-email" label="Email Us" href="mailto:support@mspfa.com" target="_blank" />
				</NavMenu>
				<NavMenu id="more" label="More">
					<NavItem id="discord" label="Discord" href="/discord" target="_blank" />
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