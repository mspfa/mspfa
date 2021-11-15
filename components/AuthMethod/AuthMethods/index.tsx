import './styles.module.scss';
import Button from 'components/Button';
import type { PrivateUser } from 'lib/client/users';
import { useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import AuthMethod from 'components/AuthMethod';
import Dialog from 'lib/client/Dialog';
import AuthButton from 'components/Button/AuthButton';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import type { AuthMethodOptions, ClientAuthMethod } from 'lib/client/auth';

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

	const onResolve = useFunction(async (authMethodOptions: AuthMethodOptions) => {
		const { data: authMethod } = await (api as AuthMethodsAPI).post(`users/${userID}/authMethods`, authMethodOptions);

		if (Dialog.getByID('auth-methods')) {
			setAuthMethods([...authMethods, authMethod]);
		}
	});

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
						useFunction(() => {
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
						})
					}
				>
					Add Sign-In Method
				</Button>
			</div>
		</div>
	);
};

export default AuthMethods;