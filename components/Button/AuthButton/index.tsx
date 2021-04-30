import './styles.module.scss';
import Button from 'components/Button';
import { useCallback } from 'react';
import Head from 'next/head';
import env from 'modules/client/env';
import { Dialog } from 'modules/client/dialogs';
import LabeledDialogGrid from 'components/Grid/LabeledDialogGrid';
import FieldGridRow from 'components/Grid/FieldGridRow';
import { toKebabCase, toPattern } from 'modules/client/utilities';
import type { ButtonProps } from 'components/Button';
import type { AuthMethodOptions } from 'pages/api/users/[userID]/authMethods';

/** The global Google API object. */
declare const gapi: any;

// TODO: Remove this after locales are implemented.
const authMethodTypes: Record<AuthMethodOptions['type'], string> = {
	password: 'Password',
	google: 'Google',
	discord: 'Discord'
};

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
				<LabeledDialogGrid>
					<FieldGridRow
						name="password"
						type="password"
						autoComplete="new-password"
						required
						minLength={8}
						label="New Password"
						autoFocus
					/>
					<FieldGridRow
						name="confirmPassword"
						type="password"
						autoComplete="new-password"
						required
						placeholder="Re-Type Password"
						pattern={toPattern(values.password)}
						label="Confirm"
					/>
				</LabeledDialogGrid>
			),
			actions: [
				{ label: 'Okay', focus: false },
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
	google: () => new Promise<AuthMethodOptions>(resolve => {
		const onError = (error: any) => {
			if (error.error === 'popup_closed_by_user') {
				console.warn(error);
			} else {
				console.error(error);
				new Dialog({
					title: 'Error',
					content: JSON.stringify(error)
				});
			}
		};

		gapi.load('auth2', () => {
			gapi.auth2.init().then((auth2: any) => {
				auth2.signIn().then((user: any) => {
					resolve({
						type: 'google',
						value: user.getAuthResponse().id_token
					});
				}).catch(onError);
			}).catch(onError);
		});
	}),
	discord: () => new Promise<AuthMethodOptions>(resolve => {
		const win = window.open(`https://discord.com/api/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(location.origin)}%2Fsign-in%2Fdiscord&response_type=code&scope=identify%20email`, 'SignInWithDiscord');

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
	<>
		{type === 'google' && (
			<Head>
				<meta name="google-signin-client_id" content={env.GOOGLE_CLIENT_ID} />
				<script src="https://apis.google.com/js/platform.js" defer />
			</Head>
		)}
		<Button
			className={`auth-button-${toKebabCase(type)}`}
			onClick={
				useCallback(async () => {
					onResolve(await promptAuthMethod[type]());

					await resolveAddAuthMethodDialog();
				}, [type, onResolve])
			}
			{...props}
		>
			{authMethodTypes[type]}
		</Button>
	</>
);

export default AuthButton;