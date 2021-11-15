import './styles.module.scss';
import Button from 'components/Button';
import api from 'lib/client/api';
import type { PrivateUser } from 'lib/client/users';
import type { ClientAuthMethod } from 'lib/client/auth';
import { authMethodTypeNames } from 'lib/client/auth';
import type { Dispatch, SetStateAction } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { APIClient } from 'lib/client/api';
import Dialog from 'lib/client/Dialog';

type AuthMethodAPI = APIClient<typeof import('pages/api/users/[userID]/authMethods/[authMethodID]').default>;

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
				{authMethodTypeName + (authMethod.name ? ` (${authMethod.name})` : '')}
			</div>
			<Button
				className="small spaced"
				disabled={authMethods.length === 1}
				onClick={
					useFunction(async () => {
						if (!await Dialog.confirm({
							id: `confirm-remove-auth-method-${authMethod.id}`,
							title: 'Remove Sign-In Method',
							content: (
								<>
									Are you sure you want to remove this {authMethodTypeName} sign-in method?
									{authMethod.name ? (
										<>
											<br />
											<br />
											<i>{authMethod.name}</i>
										</>
									) : null}
								</>
							)
						})) {
							return;
						}

						await (api as AuthMethodAPI).delete(`users/${userID}/authMethods/${authMethod.id}`);

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