import './styles.module.scss';
import { setSignInPage, resolveExternalSignIn } from 'lib/client/signIn';
import Link from 'components/Link';
import createUpdater from 'react-component-updater';
import type { ChangeEvent } from 'react';
import { useState, useRef, useEffect } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import Captcha from 'components/Captcha';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import LabeledGrid from 'components/LabeledGrid';
import ForgotPassword from 'components/ForgotPassword';
import AuthButton from 'components/Button/AuthButton';
import BirthdateField from 'components/DateField/BirthdateField';
import { escapeRegExp } from 'lodash';
import type { CancelTokenSource } from 'axios';
import axios from 'axios';
import useMountedRef from 'lib/client/reactHooks/useMountedRef';
import useThrottled from 'lib/client/reactHooks/useThrottled';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import type { integer } from 'lib/types';
import Row from 'components/Row';

type EmailTakenAPI = APIClient<typeof import('pages/api/emailTaken').default>;

const startSigningUp = () => {
	setSignInPage(1);
};

const [useSignInValuesUpdater, updateSignInValues] = createUpdater();

/** The initial values of the sign-in dialog's form. */
export const initialSignInValues = {
	email: '',
	password: '',
	confirmPassword: '',
	name: '',
	termsAgreed: false,
	birthdate: '',
	captchaToken: ''
};

export let signInValues = { ...initialSignInValues };

export const resetSignInValues = () => {
	signInValues = { ...initialSignInValues };
	updateSignInValues();
};

const onChange = (
	event: ChangeEvent<(
		HTMLInputElement
		& HTMLSelectElement
		& { name: keyof typeof signInValues }
	)>
) => {
	if (event.target.type === 'checkbox') {
		(signInValues[event.target.name] as boolean) = event.target.checked;
	} else {
		(signInValues[event.target.name] as string) = event.target.value;
	}
	updateSignInValues();
};

// The following regular expression is copied directly from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address.
const emailTest = /^[a-zA-Z0-9.!#$%&'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export type SignInProps = {
	/** 0 if signing in and not signing up. 1 or more for the page of the sign-up form the user is on. */
	page: integer
};

const SignIn = ({ page }: SignInProps) => {
	useSignInValuesUpdater();

	const mountedRef = useMountedRef();

	// This state is whether the inputted email is valid and taken on `page === 1`, or undefined if whether it's taken is still loading.
	const [emailTaken, setEmailTaken] = useState<boolean>();

	const cancelTokenSourceRef = useRef<CancelTokenSource>();

	/** Asynchronously checks if the `email` is taken and sets the `emailTaken` state accordingly. */
	const checkEmail = useThrottled(async (email: string) => {
		cancelTokenSourceRef.current = axios.CancelToken.source();

		const { data: { taken } } = await (api as EmailTakenAPI).get('/emailTaken', {
			params: { email },
			cancelToken: cancelTokenSourceRef.current.token
		});

		cancelTokenSourceRef.current = undefined;

		if (mountedRef.current) {
			setEmailTaken(taken);
		}
	});

	/** If `page === 1`, queues an update to the `emailTaken` state, possibly via a `checkEmail` call. */
	const updateEmailTaken = useFunction((email: string) => {
		// Cancel the last `checkEmail` call, if there is one pending.
		if (checkEmail.timeoutRef.current) {
			clearTimeout(checkEmail.timeoutRef.current);
		}
		// Cancel the last `/emailTaken` request, if there is one pending.
		if (cancelTokenSourceRef.current) {
			cancelTokenSourceRef.current.cancel();
			cancelTokenSourceRef.current = undefined;
		}

		// If the user isn't on the first sign-up page, then stop since doing anything else would be useless.
		if (page !== 1) {
			return;
		}

		if (!emailTest.test(email)) {
			// If the email is invalid, then it shouldn't report an error for being taken.
			setEmailTaken(false);
			return;
		}

		// Set whether the email is taken as unknown, since it's about to be checked afterward by the `checkEmail` call.
		setEmailTaken(undefined);

		checkEmail(email);
	});

	const onChangeEmail = useFunction((
		event: ChangeEvent<HTMLInputElement & HTMLSelectElement & { name: 'email' }>
	) => {
		updateEmailTaken(event.target.value);

		onChange(event);
	});

	const emailInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		// Check if the email is taken in case they already have an email entered but just switched to the sign-up page.
		updateEmailTaken(signInValues.email);

		// `page` should be a dependency here so `updateEmailTaken` runs again each time the `page` changes.
	}, [page, updateEmailTaken]);

	useIsomorphicLayoutEffect(() => {
		emailInputRef.current?.setCustomValidity(
			page === 1
				? emailTaken
					? 'This email is taken.'
					: emailTaken === undefined
						? 'Checking whether this email is taken...'
						: ''
				: ''
		);
	}, [emailTaken, page]);

	return (
		<div id="sign-in-content">
			{page !== 2 && (
				<>
					<Row className="translucent">
						{page ? 'Sign up with' : 'Sign in with'}
					</Row>
					<Row id="sign-in-methods-external">
						<AuthButton type="google" onResolve={resolveExternalSignIn} />
						<AuthButton type="discord" onResolve={resolveExternalSignIn} />
					</Row>
					<Row className="translucent">
						or
					</Row>
				</>
			)}
			<LabeledGrid>
				{page === 2 ? (
					<>
						<LabeledGridRow htmlFor="sign-in-name" label="Username">
							<input
								id="sign-in-name"
								name="name"
								autoComplete="username"
								required
								maxLength={32}
								autoFocus={!signInValues.name}
								value={signInValues.name}
								onChange={onChange}
							/>
						</LabeledGridRow>
						<LabeledGridRow htmlFor="sign-in-birthdate-year" label="Birthdate">
							<BirthdateField
								id="sign-in-birthdate"
								required
								value={signInValues.birthdate}
								onChange={onChange}
							/>
						</LabeledGridRow>
					</>
				) : (
					<>
						<LabeledGridRow htmlFor="sign-in-email" label="Email">
							<input
								key={page} // This is necessary to re-render this element when `page` changes, or else `autoFocus` will not work correctly.
								type="email"
								id="sign-in-email"
								name="email"
								autoComplete="email"
								required
								maxLength={254}
								autoFocus={!signInValues.email}
								value={signInValues.email}
								onChange={onChangeEmail}
								ref={emailInputRef}
							/>
						</LabeledGridRow>
						{page === 1 && emailTaken && (
							<div id="sign-up-email-taken" className="red">
								This email is taken.
							</div>
						)}
						<LabeledGridRow htmlFor="sign-in-password" label="Password">
							<input
								type="password"
								id="sign-in-password"
								name="password"
								autoComplete={page ? 'new-password' : 'current-password'}
								required
								minLength={8}
								value={signInValues.password}
								onChange={onChange}
							/>
						</LabeledGridRow>
						{page === 0 ? (
							<ForgotPassword />
						) : (
							<LabeledGridRow htmlFor="sign-in-confirm-password" label="Confirm">
								<input
									type="password"
									id="sign-in-confirm-password"
									name="confirmPassword"
									autoComplete="new-password"
									required
									placeholder="Re-Type Password"
									pattern={escapeRegExp(signInValues.password)}
									value={signInValues.confirmPassword}
									onChange={onChange}
								/>
							</LabeledGridRow>
						)}
					</>
				)}
			</LabeledGrid>
			{page === 2 && (
				<>
					<Row>
						<Captcha />
					</Row>
					<Row id="terms-agreed-container">
						<label>
							<input
								type="checkbox"
								name="termsAgreed"
								className="spaced"
								required
								checked={signInValues.termsAgreed}
								onChange={onChange}
							/>
							<span className="spaced translucent">
								I agree to the <Link href="/terms" target="_blank">terms of service</Link>.
							</span>
						</label>
					</Row>
				</>
			)}
			{page === 0 && (
				<Row id="sign-up-link-container">
					<span className="translucent">Don't have an account? </span>
					<Link onClick={startSigningUp}>Sign up!</Link>
				</Row>
			)}
		</div>
	);
};

export default SignIn;