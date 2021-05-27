import './styles.module.scss';
import Button from 'components/Button';
import api from 'modules/client/api';
import type { PrivateUser } from 'modules/client/users';
import type { ClientAuthMethod } from 'modules/client/auth';
import { authMethodTypeNames } from 'modules/client/auth';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { APIClient } from 'modules/client/api';
import { Dialog } from 'modules/client/dialogs';

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
					useCallback(async () => {
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

						// This ESLint comment is necessary because the rule incorrectly thinks `authMethodTypeName` should be a dependency here, despite that it depends on `authMethod` which is already a dependency.
						// eslint-disable-next-line react-hooks/exhaustive-deps
					}, [userID, authMethod, authMethods, setAuthMethods])
				}
			>
				Remove
			</Button>
		</div>
	);
};

export default AuthMethod;