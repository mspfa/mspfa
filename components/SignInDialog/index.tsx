import './styles.module.scss';
import AuthButton from 'components/Button/AuthButton';
import Captcha from 'components/Captcha';
import BirthdateField from 'components/DateField/BirthdateField';
import Dialog from 'components/Dialog';
import Action from 'components/Dialog/Action';
import ForgotPassword from 'components/ForgotPassword';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import Link from 'components/Link';
import Row from 'components/Row';
import { Field } from 'formik';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import type { AuthMethodOptions } from 'lib/client/auth';
import IDPrefix from 'lib/client/reactContexts/IDPrefix';
import useEmailTaken from 'lib/client/reactHooks/useEmailTaken';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useRef, useState } from 'react';
import LabeledGrid from 'components/LabeledGrid';
import { useUser } from 'lib/client/reactContexts/UserContext';

type SessionAPI = APIClient<typeof import('pages/api/session').default>;
type UsersAPI = APIClient<typeof import('pages/api/users').default>;

/** An identifier for which page the `SignInDialog` is on. */
enum Page {
	SIGN_IN,
	SIGN_UP,
	SIGN_UP_2
}

const SignInDialog = () => {
	const [, setUser] = useUser();

	const [page, setPage] = useState(Page.SIGN_IN);

	const signingIn = page < Page.SIGN_UP;
	const onEitherFirstPage = (
		page === Page.SIGN_IN
		|| page === Page.SIGN_UP
	);

	const goToSignIn = useFunction(() => {
		setPage(Page.SIGN_IN);
	});

	const goToSignUp = useFunction(() => {
		setPage(Page.SIGN_UP);
	});

	const goToPreviousPage = useFunction(() => {
		setPage(page - 1);
	});

	const goToNextPage = useFunction(() => {
		setPage(page + 1);
	});

	const authMethodOptionsRef = useRef<AuthMethodOptions>();

	const initialValues = {
		email: '',
		password: '',
		confirmPassword: '',
		name: '',
		birthdate: '',
		termsAgreed: false,
		captchaToken: ''
	};

	type Values = typeof initialValues;
	const dialogElement = (
		<Dialog
			id="sign-in"
			title={signingIn ? 'Sign In' : 'Sign Up'}
			initialValues={initialValues}
			onSubmit={
				useFunction(async (values: Values) => {
					const authMethodOptions = authMethodOptionsRef.current!;

					const { data } = await (api as SessionAPI | UsersAPI).post(
						signingIn ? '/session' : '/users',
						{
							email: authMethodOptions.type === 'password' ? values.email : undefined,
							authMethod: authMethodOptions,
							...!signingIn && {
								captchaToken: values.captchaToken,
								name: values.name,
								birthdate: +values.birthdate
							}
						} as any,
						{
							// Don't show the error dialog for failure to sign into an unverified account.
							beforeInterceptError: error => {
								const userWithNoVerifiedEmail = error.response?.data.id && !error.response.data.email;
								if (!userWithNoVerifiedEmail) {
									return;
								}

								error.preventDefault();

								Dialog.create(
									<Dialog id="verify-email" title="Verify Email">
										TODO
									</Dialog>
								);
							}
						}
					);

					setUser(data);
					authMethodOptionsRef.current = undefined;
				})
			}
		>
			{function Content({ values, submitForm }) {
				const { emailInputRef, emailTakenGridRow } = useEmailTaken(
					!signingIn && values.email
				);

				const setAuthMethodToPassword = useFunction(() => {
					authMethodOptionsRef.current = {
						type: 'password',
						value: values.password
					};
				});

				const continueWithPassword = useFunction(() => {
					setAuthMethodToPassword();
					goToNextPage();
				});

				const onResolveAuth = useFunction((authMethodOptions: AuthMethodOptions) => {
					authMethodOptionsRef.current = authMethodOptions;

					if (signingIn) {
						submitForm();
					} else {
						goToNextPage();
					}
				});

				return onEitherFirstPage ? (
					<LabeledGrid>
						<Row className="translucent">
							{signingIn ? 'Sign in with' : 'Sign up with'}
						</Row>
						<Row>
							<AuthButton type="google" onResolve={onResolveAuth} />
							<AuthButton type="discord" onResolve={onResolveAuth} />
						</Row>
						<Row className="translucent">
							or
						</Row>
						<LabeledGridField
							type="email"
							name="email"
							label="Email"
							autoComplete="email"
							required
							maxLength={254}
							// Without this `key`, `autoFocus` will not work correctly.
							key={page}
							autoFocus={!values.email}
							innerRef={emailInputRef as any}
						/>
						{emailTakenGridRow}
						<LabeledGridField
							type="password"
							name="password"
							label="Password"
							autoComplete={signingIn ? 'current-password' : 'new-password'}
							required
						/>
						{signingIn ? (
							<>
								<ForgotPassword />
								<Row id="sign-up-link-container">
									<span className="translucent">Don't have an account? </span>
									<Link onClick={goToSignUp}>Sign up!</Link>
								</Row>

								{Action.CANCEL}
								<Action onClick={setAuthMethodToPassword}>
									Sign In
								</Action>
							</>
						) : (
							<>
								{/* TODO: Require passwords to match. */}
								<LabeledGridField
									type="password"
									name="confirmPassword"
									label="Confirm"
									autoComplete="new-password"
									required
									placeholder="Re-Type Password"
								/>

								<Action keepOpen cancel onClick={goToSignIn}>
									Go Back
								</Action>
								<Action keepOpen onClick={continueWithPassword}>
									Continue
								</Action>
							</>
						)}
					</LabeledGrid>
				) : (
					<LabeledGrid>
						<LabeledGridField
							name="name"
							label="Username"
							autoComplete="username"
							required
							maxLength={32}
							autoFocus={!values.name}
						/>
						<LabeledGridRow htmlFor="sign-in-field-birthdate-year" label="Birthdate">
							<BirthdateField required />
						</LabeledGridRow>
						<Row>
							<Captcha name="captchaToken" />
						</Row>
						<Row id="terms-agreed-container">
							<label>
								<Field
									type="checkbox"
									name="termsAgreed"
									className="spaced"
									required
								/>
								<span className="spaced translucent">
									I agree to the <Link href="/terms" target="_blank">terms of service</Link>.
								</span>
							</label>
						</Row>

						<Action cancel keepOpen onClick={goToPreviousPage}>
							Go Back
						</Action>
						<Action
							disabled={!(values.captchaToken && values.termsAgreed)}
						>
							Sign Up
						</Action>
					</LabeledGrid>
				);
			}}
		</Dialog>
	);

	return (
		<IDPrefix.Provider value="sign-in">
			{dialogElement}
		</IDPrefix.Provider>
	);
};

export default SignInDialog;

SignInDialog.create = () => {
	Dialog.create(
		<SignInDialog />
	);
};
