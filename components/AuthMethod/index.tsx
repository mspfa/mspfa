import Button from 'components/Button';
import api from 'modules/client/api';
import type { PrivateUser } from 'modules/client/users';
import type { AuthMethod as AuthMethodType } from 'modules/server/users';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { APIClient } from 'modules/client/api';
import { Dialog } from 'modules/client/dialogs';
import './styles.module.scss';

type AuthMethodAPI = APIClient<typeof import('pages/api/users/[userID]/authMethods/[authMethodID]').default>;

type AuthMethodProp = Pick<AuthMethodType, 'type' | 'name' | 'id'>;

const authMethodTypes: Record<AuthMethodProp['type'], string> = {
	password: 'Email and Password',
	google: 'Google',
	discord: 'Discord'
};

export type AuthMethodProps = {
	userID: PrivateUser['id'],
	authMethod: AuthMethodProp,
	authMethods: AuthMethodProp[],
	setAuthMethods: Dispatch<SetStateAction<AuthMethodProp[]>>
};

const AuthMethod = ({ userID, authMethod, authMethods, setAuthMethods }: AuthMethodProps) => {
	const authMethodType = authMethodTypes[authMethod.type];

	return (
		<div className="auth-method" key={authMethod.id}>
			<div className="auth-method-content">
				{authMethodType}
				{authMethod.name && (
					<> ({authMethod.name})</>
				)}
			</div>
			<Button
				className="small spaced"
				disabled={authMethods.length === 1}
				onClick={
					useCallback(async () => {
						if (!await Dialog.confirm({
							id: `confirm-remove-auth-method-${authMethod.id}`,
							title: 'Remove Sign-In Method',
							content: <>
								Are you sure you want to remove this {authMethodType} sign-in method?

								{authMethod.name && `\n\n${authMethod.name}`}
							</>
						})) {
							return;
						}

						await (api as AuthMethodAPI).delete(`users/${userID}/authMethods/${authMethod.id}`);

						setAuthMethods(authMethods.filter(({ id }) => id !== authMethod.id));

						// This ESLint comment is necessary because the rule incorrectly thinks `authMethodType` should be a dependency here, despite that it depends on `authMethod` which is already a dependency.
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