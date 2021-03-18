import './styles.module.scss';

const SignInContent = () => (
	<div id="sign-in-content">
		<div id="sign-in-method-password">
			<label htmlFor="email">
				Email:
			</label>
			<input id="email" name="email" type="email" required autoFocus maxLength={254} autoComplete="email" />
			<label htmlFor="password">
				Password:
			</label>
			<input id="password" name="password" type="password" required autoComplete="current-password" />
		</div>
		<p>or</p>
		<div id="sign-in-method-other">
			<button id="sign-in-method-google" type="button">Google</button>
			<button id="sign-in-method-discord" type="button">Discord</button>
		</div>
	</div>
);

export default SignInContent;