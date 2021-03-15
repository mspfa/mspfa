import './styles.module.scss';

const SignInContent = () => (
	<>
		<div id="sign-in-method-password">
			<label htmlFor="email">
				Email:
			</label>
			<input id="email" name="email" type="email" required autoFocus maxLength={254} />
			<label htmlFor="password">
				Password:
			</label>
			<input id="password" name="password" type="password" required autoComplete="current-password" />
		</div>
	</>
);

export default SignInContent;