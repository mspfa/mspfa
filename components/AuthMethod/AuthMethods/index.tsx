import './styles.module.scss';
import Button from 'components/Button';
import type { PrivateUser } from 'modules/client/users';
import { useCallback, useState } from 'react';
import AuthMethod from 'components/AuthMethod';
import { Dialog } from 'modules/client/dialogs';
import AuthButton from 'components/Button/AuthButton';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import type { AuthMethodOptions, ClientAuthMethod } from 'modules/client/auth';

type AuthMethodsAPI = APIClient<typeof import('pages/api/users/[userID]/authMethods').default>;

export type AuthMethodsProps = {
	userID: PrivateUser['id'],
	authMethods: ClientAuthMethod[]
};

const AuthMethods = ({
	userID,
	authMethods: initialAuthMethods
}: AuthMethodsProps) => {
	const [authMethods, setAuthMethods] = useState(initialAuthMethods);

	const onResolve = useCallback(async (authMethodOptions: AuthMethodOptions) => {
		const { data: authMethod } = await (api as AuthMethodsAPI).post(`users/${userID}/authMethods`, authMethodOptions);

		if (Dialog.getByID('auth-methods')) {
			setAuthMethods([...authMethods, authMethod]);
		}
	}, [userID, authMethods]);

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
										<AuthButton type="google" onResolve={onResolve} autoFocus />
										<AuthButton type="discord" onResolve={onResolve} />
										{!authMethods.some(({ type }) => type === 'password') && (
											<AuthButton type="password" onResolve={onResolve} />
										)}
									</>
								),
								actions: [
									{ label: 'Cancel', autoFocus: false }
								]
							});
						}, [onResolve, authMethods])
					}
				>
					Add Sign-In Method
				</Button>
			</div>
		</div>
	);
};

export default AuthMethods;