import './styles.module.scss';
import Button from 'components/Button';
import api from 'lib/client/api';
import type { PrivateUser } from 'lib/client/users';
import type { ClientAuthMethod } from 'lib/client/auth';
import { authMethodTypeNames } from 'lib/client/auth';
import type { Dispatch, SetStateAction } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { APIClient } from 'lib/client/api';
import Dialog from 'components/Dialog';

type AuthMethodAPI = APIClient<typeof import('pages/api/users/[userID]/auth-methods/[authMethodID]').default>;

export type AuthMethodProps = {
	userID: PrivateUser['id'],
	authMethod: ClientAuthMethod,
	authMethods: ClientAuthMethod[],
	setAuthMethods: Dispatch<SetStateAction<ClientAuthMethod[]>>
};

const AuthMethod = ({ userID, authMethod, authMethods, setAuthMethods }: AuthMethodProps) => {
	const authMethodTypeName = authMethodTypeNames[authMethod.type];

	return (
		<div className="auth-method" key={authMethod.id}>
			<div className="auth-method-content spaced">
				{authMethodTypeName}
				{authMethod.name && (
					<span className="translucent">
						{` (${authMethod.name})`}
					</span>
				)}
			</div>
			<Button
				className="small spaced"
				disabled={authMethods.length === 1}
				onClick={
					useFunction(async () => {
						if (!await Dialog.confirm(
							<Dialog
								id={`confirm-remove-auth-method-${authMethod.id}`}
								title="Remove Sign-In Method"
							>
								Are you sure you want to remove this {authMethodTypeName} sign-in method?
								{authMethod.name && (
									<>
										<br />
										<br />
										<i>{authMethod.name}</i>
									</>
								)}
							</Dialog>
						)) {
							return;
						}

						await (api as AuthMethodAPI).delete(`/users/${userID}/auth-methods/${authMethod.id}`);

						if (Dialog.getByID('auth-methods')) {
							setAuthMethods(authMethods.filter(({ id }) => id !== authMethod.id));
						}
					})
				}
			>
				Remove
			</Button>
		</div>
	);
};

export default AuthMethod;
