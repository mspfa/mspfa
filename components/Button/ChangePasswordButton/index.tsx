import Button from 'components/Button';
import ForgotPassword from 'components/ForgotPassword';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Dialog from 'lib/client/Dialog';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { PrivateUser } from 'lib/client/users';
import { escapeRegExp } from 'lodash';

type UserAuthMethodsAPI = APIClient<typeof import('pages/api/users/[userID]/auth-methods').default>;
type UserPasswordAPI = APIClient<typeof import('pages/api/users/[userID]/auth-methods/password').default>;

export type ChangePasswordButtonProps = {
	privateUser: PrivateUser
};

const ChangePasswordButton = ({ privateUser }: ChangePasswordButtonProps) => (
	<Button
		className="small"
		onClick={
			useFunction(async () => {
				const { data: authMethods } = await (api as UserAuthMethodsAPI).get(`/users/${privateUser.id}/auth-methods`, {
					params: {
						type: 'password'
					}
				});

				if (authMethods.length === 0) {
					new Dialog({
						id: 'change-password',
						title: 'Error',
						content: 'Your account does not use a password to sign in. If you want to add a password to your account, select "Edit Sign-In Methods" and add a password there instead.'
					});
					return;
				}

				const changePasswordDialog = new Dialog({
					id: 'change-password',
					title: 'Change Password',
					initialValues: {
						currentPassword: '',
						password: '',
						confirmPassword: ''
					},
					content: ({ values }) => (
						<LabeledGrid>
							<LabeledGridField
								type="password"
								name="currentPassword"
								label="Current Password"
								autoComplete="current-password"
								required
								minLength={8}
								autoFocus
							/>
							<ForgotPassword />
							<LabeledGridField
								type="password"
								name="password"
								label="New Password"
								autoComplete="new-password"
								required
								minLength={8}
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

				if ((await changePasswordDialog)?.submit) {
					await (api as UserPasswordAPI).patch(`/users/${privateUser.id}/auth-methods/password`, {
						currentPassword: changePasswordDialog.form!.values.currentPassword,
						newPassword: changePasswordDialog.form!.values.password
					});

					new Dialog({
						title: 'Change Password',
						content: 'Success! Your password has been changed.'
					});
				}
			})
		}
	>
		Change Password
	</Button>
);

export default ChangePasswordButton;
