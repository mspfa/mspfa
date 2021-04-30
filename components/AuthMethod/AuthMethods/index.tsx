import Button from 'components/Button';
import type { PrivateUser } from 'modules/client/users';
import { useCallback, useState } from 'react';
import AuthMethod from 'components/AuthMethod';
import type { ClientAuthMethod } from 'components/AuthMethod';
import { Dialog } from 'modules/client/dialogs';
import AuthButton from 'components/Button/AuthButton';
import './styles.module.scss';

export type AuthMethodsProps = {
	userID: PrivateUser['id'],
	authMethods: ClientAuthMethod[]
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
							new Dialog({
								id: 'add-auth-method',
								title: 'Add Sign-In Method',
								content: (
									<>
										<AuthButton type="password" />
										<AuthButton type="google" />
										<AuthButton type="discord" />
									</>
								),
								actions: ['Cancel']
							});
						}, [userID, initialAuthMethods])
					}
				>
					Add Sign-In Method
				</Button>
			</div>
		</div>
	);
};

export default AuthMethods;