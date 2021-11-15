import './styles.module.scss';
import Button from 'components/Button';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'lib/client/Dialog';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import toKebabCase from 'lib/client/toKebabCase';
import type { ButtonProps } from 'components/Button';
import type { AuthMethodOptions } from 'lib/client/auth';
import { authMethodTypeNames } from 'lib/client/auth';
import { startLoading, stopLoading } from 'components/LoadingIndicator';
import loadScript from 'lib/client/loadScript';
import { escapeRegExp } from 'lodash';

/** The global Google API object. */
declare const gapi: any;

const resolveAddAuthMethodDialog = () => Dialog.getByID('add-auth-method')?.resolve();

const promptAuthMethod = {
	password: () => new Promise<AuthMethodOptions>(async resolve => {
		await resolveAddAuthMethodDialog();

		const dialog = new Dialog({
			id: 'add-auth-method',
			title: 'Add Password',
			initialValues: {
				password: '' as string,
				confirmPassword: '' as string
			},
			content: ({ values }) => (
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
				</LabeledGrid>
			),
			actions: [
				{ label: 'Okay', autoFocus: false },
				'Cancel'
			]
		});

		if ((await dialog)?.submit) {
			resolve({
				type: 'password',
				value: dialog.form!.values.password
			});
		}
	}),
	google: () => new Promise<AuthMethodOptions>(async resolve => {
		const onError = (error: any) => {
			if (error.error === 'popup_closed_by_user') {
				console.warn(error);
			} else {
				console.error(error);
				new Dialog({
					title: 'Error',
					content: (
						error instanceof Error
							? error.toString()
							: error instanceof Event
								? 'The Google API script failed to load.'
								: JSON.stringify(error)
					)
				});
			}
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
					}).catch(onError);
				}).catch((error: any) => {
					onError(error);
					stopLoading();
				});
			});
		}).catch(onError);
	}),
	discord: () => new Promise<AuthMethodOptions>(resolve => {
		const win = window.open(
			`https://discord.com/api/oauth2/authorize?${new URLSearchParams({
				client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
				redirect_uri: `${location.origin}/sign-in/discord`,
				response_type: 'code',
				scope: 'identify email'
			})}`,
			'SignInWithDiscord'
		);

		const winClosedPoll = setInterval(() => {
			if (!win || win.closed) {
				clearInterval(winClosedPoll);
				console.warn('The Discord sign-in page was closed.');
			}
		}, 200);

		const onMessage = (event: MessageEvent<any>) => {
			if (event.origin === window.origin && event.source === win) {
				window.removeEventListener('message', onMessage);
				clearInterval(winClosedPoll);

				if (event.data.error) {
					if (event.data.error === 'access_denied') {
						// Ignore `access_denied` because it is triggered when the user selects "Cancel" on the Discord auth screen.
						console.warn(event.data);
					} else {
						console.error(event.data);
						new Dialog({
							title: 'Error',
							content: event.data.error_description
						});
					}
				} else {
					resolve({
						type: 'discord',
						value: event.data.code
					});
				}
			}
		};
		window.addEventListener('message', onMessage);
	})
};

export type AuthButtonProps = Omit<ButtonProps, 'type' | 'className' | 'onClick'> & {
	type: keyof typeof promptAuthMethod,
	onResolve: (authMethodOptions: AuthMethodOptions) => void
};

const AuthButton = ({ type, onResolve, ...props }: AuthButtonProps) => (
	<Button
		className={`auth-button-${toKebabCase(type)}`}
		onClick={
			useFunction(async () => {
				onResolve(await promptAuthMethod[type]());

				await resolveAddAuthMethodDialog();
			})
		}
		{...props}
	>
		{authMethodTypeNames[type]}
	</Button>
);

export default AuthButton;