import './styles.module.scss';
import Button from 'components/Button';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'components/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import toKebabCase from 'lib/client/toKebabCase';
import type { ButtonProps } from 'components/Button';
import type { AuthMethodOptions, ClientAuthMethod } from 'lib/client/auth';
import { authMethodTypeNames } from 'lib/client/auth';
import { startLoading, stopLoading } from 'components/LoadingIndicator';
import loadScript from 'lib/client/loadScript';
import { escapeRegExp } from 'lodash';
import Action from 'components/Dialog/Action';

/** The global Google API object. */
declare const gapi: any;

const promptAuthMethod = (
	type: ClientAuthMethod['type']
) => new Promise<AuthMethodOptions>(async resolve => {
	if (type === 'google') {
		const catchError = (error: any) => {
			if (error.error === 'popup_closed_by_user') {
				console.warn(error);
				return;
			}

			console.error(error);

			const errorMessage = error instanceof Error
				? error.toString()
				: error instanceof Event
					? 'The Google API script failed to load.'
					: JSON.stringify(error);

			Dialog.create(
				<Dialog title="Error">
					{errorMessage}
				</Dialog>
			);
		};

		loadScript('https://apis.google.com/js/platform.js', () => {
			const googleClientIDMeta = document.createElement('meta');
			googleClientIDMeta.name = 'google-signin-client_id';
			googleClientIDMeta.content = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
			document.head.appendChild(googleClientIDMeta);
		}).then(() => {
			gapi.load('auth2', () => {
				startLoading();

				gapi.auth2.init().then((auth2: any) => {
					stopLoading();

					auth2.signIn().then((user: any) => {
						resolve({
							type: 'google',
							value: user.getAuthResponse().id_token
						});
					}).catch(catchError);
				}).catch((error: any) => {
					catchError(error);
					stopLoading();
				});
			});
		}).catch(catchError);

		return;
	}

	if (type === 'discord') {
		const discordWindow = window.open(
			`https://discord.com/api/oauth2/authorize?${new URLSearchParams({
				client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
				redirect_uri: `${location.origin}/sign-in/discord`,
				response_type: 'code',
				scope: 'identify email'
			})}`,
			'SignInWithDiscord'
		);

		const discordWindowClosedPoll = setInterval(() => {
			if (!discordWindow || discordWindow.closed) {
				clearInterval(discordWindowClosedPoll);
			}
		}, 200);

		const onMessage = (event: MessageEvent<any>) => {
			if (!(event.origin === window.origin && event.source === discordWindow)) {
				return;
			}

			window.removeEventListener('message', onMessage);
			clearInterval(discordWindowClosedPoll);

			if (!event.data.error) {
				resolve({
					type: 'discord',
					value: event.data.code
				});
				return;
			}

			if (event.data.error === 'access_denied') {
				// Ignore `access_denied` because it is triggered when the user selects "Cancel" on the Discord auth screen.
				console.warn(event.data);
				return;
			}

			console.error(event.data);
			Dialog.create(
				<Dialog title="Error">
					{event.data.error_description}
				</Dialog>
			);
		};
		window.addEventListener('message', onMessage);

		return;
	}

	(type satisfies 'password');

	const dialog = await Dialog.create(
		<Dialog
			id="add-auth-method"
			title="Add Password"
			initialValues={{
				password: '',
				confirmPassword: ''
			}}
		>
			{({ values }) => (
				<LabeledGrid>
					<LabeledGridField
						type="password"
						name="password"
						label="New Password"
						autoComplete="new-password"
						required
						minLength={8}
						autoFocus
					/>
					<LabeledGridField
						type="password"
						name="confirmPassword"
						label="Confirm"
						autoComplete="new-password"
						required
						placeholder="Re-Type Password"
						pattern={escapeRegExp(values.password)}
					/>

					{Action.OKAY}
					{Action.CANCEL}
				</LabeledGrid>
			)}
		</Dialog>
	);

	if (dialog.canceled) {
		return;
	}

	resolve({
		type: 'password',
		value: dialog.values.password
	});
});

export type AuthButtonProps = Omit<ButtonProps, 'type' | 'className' | 'onClick'> & {
	type: ClientAuthMethod['type'],
	onResolve: (authMethodOptions: AuthMethodOptions) => void
};

const AuthButton = ({ type, onResolve, ...props }: AuthButtonProps) => (
	<Button
		className={`auth-button auth-button-${toKebabCase(type)}`}
		onClick={
			useFunction(async () => {
				const authMethodOptions = await promptAuthMethod(type);

				onResolve(authMethodOptions);
			})
		}
		{...props}
	>
		{authMethodTypeNames[type]}
	</Button>
);

export default AuthButton;
