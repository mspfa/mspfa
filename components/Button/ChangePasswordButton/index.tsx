import Button from 'components/Button';
import ForgotPassword from 'components/ForgotPassword';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Dialog from 'components/Dialog';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { PrivateUser } from 'lib/client/users';
import { escapeRegExp } from 'lodash';
import Action from 'components/Dialog/Action';

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
				const { data: authMethods } = await (api as UserAuthMethodsAPI).get(
					`/users/${privateUser.id}/auth-methods`,
					{ params: { type: 'password' } }
				);

				if (authMethods.length === 0) {
					Dialog.create(
						<Dialog title="Error">
							Your account does not use a password to sign in. If you want to add a password to your account, select "Edit Sign-In Methods" and add a password there instead.
						</Dialog>
					);
					return;
				}

				const initialValues = {
					currentPassword: '',
					newPassword: '',
					confirmPassword: ''
				};

				type Values = typeof initialValues;
				const changePasswordDialog = await Dialog.create<Values>(
					<Dialog
						id="change-password"
						title="Change Password"
						initialValues={initialValues}
					>
						{({ values }) => (
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
									name="newPassword"
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
									pattern={escapeRegExp(values.newPassword)}
								/>
								{Action.OKAY} {Action.CANCEL}
							</LabeledGrid>
						)}
					</Dialog>
				);

				if (changePasswordDialog.canceled) {
					return;
				}

				const { currentPassword, newPassword } = changePasswordDialog.values;

				await (api as UserPasswordAPI).patch(
					`/users/${privateUser.id}/auth-methods/password`,
					{ currentPassword, newPassword }
				);

				Dialog.create(
					<Dialog title="Change Password">
						Success! Your password has been changed.
					</Dialog>
				);
			})
		}
	>
		Change Password
	</Button>
);

export default ChangePasswordButton;
