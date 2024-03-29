import './styles.module.scss';
import NavGroup from 'components/Nav/NavGroup';
import NavItem from 'components/Nav/NavItem';
import NavMenu from 'components/Nav/NavMenu';
import Router, { useRouter } from 'next/router';
import { useUser } from 'lib/client/reactContexts/UserContext';
import useSticky from 'lib/client/reactHooks/useSticky';
import { useContext, useRef } from 'react';
import StoryIDContext from 'lib/client/reactContexts/StoryIDContext';
import PreviewModeContext from 'lib/client/reactContexts/PreviewModeContext';
import Dialog from 'components/Dialog';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import openSignInDialog from 'lib/client/openSignInDialog';
import classes from 'lib/client/classes';
import useFunction from 'lib/client/reactHooks/useFunction';

type SessionAPI = APIClient<typeof import('pages/api/session').default>;

const visitRandomStory = () => {
	// TODO: Visit random story.

	Router.push(`/?s=${Math.random()}&p=1`);
};

const Nav = () => {
	const router = useRouter();

	const [user, setUser] = useUser();

	const notificationsBubble = 0;
	let messagesBubble = 0;

	if (user) {
		messagesBubble = (
			router.pathname === '/users/[userID]/messages'
				? 0
				: user.unreadMessageCount
		);
	}

	const promptSignOut = useFunction(async () => {
		if (await Dialog.confirm(
			<Dialog id="sign-out" title="Sign Out">
				Are you sure you want to sign out?
			</Dialog>
		)) {
			await (api as SessionAPI).delete('/session');
			setUser(undefined);
		}
	});

	const ref = useRef<HTMLElement>(null as never);
	useSticky(ref);

	const storyID = useContext(StoryIDContext);
	const previewMode = useContext(PreviewModeContext);

	return (
		<nav
			className={classes({ sticky: user?.settings.stickyNav })}
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
						<hr />
						<NavItem id="stories" label="Adventures" href={`/users/${user.id}/stories`} />
						<NavItem id="favs" label="Favorites" href={`/users/${user.id}/favs`} />
						<NavItem id="saves" label="Game Saves" href={`/users/${user.id}/saves`} />
						<hr />
						<NavItem id="profile" label="Profile" href={`/users/${user.id}`} />
						<NavItem id="settings" label="Settings" href={`/users/${user.id}/settings`} />
						<hr />
						<NavItem id="sign-out" label="Sign Out" onClick={promptSignOut} />
					</NavMenu>
				) : (
					<NavItem id="sign-in" label="Sign In" onClick={openSignInDialog} />
				)}
			</NavGroup>
			<NavGroup id="secondary">
				<NavMenu id="browse" label="Browse">
					<NavItem id="browse-stories" label="Adventures" href="/browse/stories" />
					<NavItem id="browse-users" label="Users" href="/browse/users" />
					<hr />
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
				<NavItem id="donate" label="Donate <3" href="https://www.patreon.com/mspfa" target="_blank" />
				<NavMenu id="more" label="More">
					<NavItem id="discord" label="Discord" href="/discord" target="_blank" />
					<NavItem id="twitter" label="Twitter" href="https://twitter.com/mspfa" target="_blank" />
					<NavItem id="github" label="GitHub" href="https://github.com/MSPFA/MSPFA" target="_blank" />
				</NavMenu>
			</NavGroup>
			<NavGroup id="misc">
				<NavMenu id="help" label="Help">
					<NavItem id="help-discord" label="Ask on Discord" href="/discord" target="_blank" />
					<NavItem id="support-email" label="Email Us" href="mailto:support@mspfa.com" target="_blank" />
				</NavMenu>
				<NavMenu id="policies" label="Boring">
					<NavItem id="rules" label="Rules" href="/rules" />
					<hr />
					<NavItem id="terms" label="Terms of Service" href="/terms" />
					<NavItem id="privacy" label="Privacy Policy" href="/privacy" />
				</NavMenu>
			</NavGroup>
		</nav>
	);
};

export default Nav;
