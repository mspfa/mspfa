import Button from 'components/Button';
import type { AuthMethod } from 'modules/server/users';
import { useState } from 'react';
import './styles.module.scss';

const authMethodTypes: Record<AuthMethod['type'], string> = {
	password: 'Password',
	google: 'Google',
	discord: 'Discord'
};

export type EditAuthMethodsProps = {
	authMethods: Array<Pick<AuthMethod, 'type' | 'name' | 'id'>>
};

const EditAuthMethods = ({ authMethods: initialAuthMethods }: EditAuthMethodsProps) => {
	const [authMethods, setAuthMethods] = useState(initialAuthMethods);

	return (
		<>
			{authMethods.map(authMethod => (
				<div className="auth-method" key={authMethod.id}>
					<div className="auth-method-content">
						{authMethodTypes[authMethod.type]}
						{authMethod.name && (
							<> ({authMethod.name})</>
						)}
					</div>
					<Button
						className="small spaced"
						onClick={() => {

						}}
					>
						Remove
					</Button>
				</div>
			))}
			<div id="auth-methods-footer">
				<Button
					className="small"
					autoFocus
					onClick={() => {
						// TODO
					}}
				>
					Add Sign-In Method
				</Button>
			</div>
		</>
	);
};

export default EditAuthMethods;