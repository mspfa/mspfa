import Button from 'components/Button';
import type { PrivateUser } from 'modules/client/users';
import { useCallback, useState } from 'react';
import AuthMethod, { authMethodTypes } from 'components/AuthMethod';
import type { AuthMethodProps } from 'components/AuthMethod';
import './styles.module.scss';

type AuthMethodProp = AuthMethodProps['authMethod'];

export type AuthMethodsProps = {
	userID: PrivateUser['id'],
	authMethods: AuthMethodProp[]
};

const AuthMethods = ({ userID, authMethods: initialAuthMethods }: AuthMethodsProps) => {
	const [authMethods, setAuthMethods] = useState(initialAuthMethods);

	return (
		<div id="auth-methods">
			{authMethods.map(authMethod => (
				<AuthMethod
					key={authMethod.id}
					userID={userID}
					authMethod={authMethod}
					authMethods={authMethods}
					setAuthMethods={setAuthMethods}
				/>
			))}
			<div id="auth-methods-footer">
				<Button
					className="small"
					autoFocus
					onClick={
						useCallback(() => {
							// TODO
						}, [])
					}
				>
					Add Sign-In Method
				</Button>
			</div>
		</div>
	);
};

export default AuthMethods;