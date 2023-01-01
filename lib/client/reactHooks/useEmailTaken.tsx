import type { CancelTokenSource } from 'axios';
import axios from 'axios';
import EmailTakenGridRow from 'components/EmailTakenGridRow';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import useFunction from 'lib/client/reactHooks/useFunction';
import useIsomorphicLayoutEffect from 'lib/client/reactHooks/useIsomorphicLayoutEffect';
import useOnChange from 'lib/client/reactHooks/useOnChange';
import useThrottled from 'lib/client/reactHooks/useThrottled';
import type { EmailString } from 'lib/types';
import { useEffect, useMemo, useRef, useState } from 'react';

type EmailTakenAPI = APIClient<typeof import('pages/api/email-taken').default>;

// The following regular expression is copied directly from https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address.
const EMAIL_ADDRESS = /^[a-zA-Z0-9.!#$%&'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Checks if the inputted email is taken. Returns a ref which must be passed to the email input (to call `setCustomValidity` on), and a node which must be placed immediately after the email grid field (possibly containing an `EmailTakenGridRow`). */
const useEmailTaken = (
	/** The email to check. If this is `undefined`, `false`, or not a valid email, no checks will be done and it won't be considered taken. */
	email: string | undefined | false
) => {
	const validEmail = useMemo(() => (
		typeof email === 'string' && EMAIL_ADDRESS.test(email)
	), [email]);

	// This state is whether the email is taken, or `undefined` if whether it's taken is loading.
	// This state should be completely ignored when `!validEmail`.
	const [emailTaken, setEmailTaken] = useState<boolean>();

	const emailInputRef = useRef<HTMLInputElement>(null);

	const getEmailCustomValidity = (): string => {
		if (!validEmail) {
			// Let the browser handle the invalid email.
			return '';
		}

		if (emailTaken === undefined) {
			return 'Checking whether this email is taken...';
		}

		if (emailTaken) {
			return 'This email is taken.';
		}

		// All is valid.
		return '';
	};
	const emailCustomValidity = getEmailCustomValidity();

	// This must be a layout effect to prevent any moment for which the email input is valid but shouldn't be.
	useIsomorphicLayoutEffect(() => {
		emailInputRef.current?.setCustomValidity(emailCustomValidity);
	}, [emailCustomValidity]);

	const cancelTokenSourceRef = useRef<CancelTokenSource>();

	const checkEmailTaken = useThrottled(500, async (validEmail: EmailString) => {
		cancelTokenSourceRef.current = axios.CancelToken.source();

		const { data } = await (api as EmailTakenAPI).get('/email-taken', {
			params: { email: validEmail },
			cancelToken: cancelTokenSourceRef.current.token
		});

		cancelTokenSourceRef.current = undefined;

		setEmailTaken(data.taken);
	});

	const cancelEmailTakenCheck = useFunction(() => {
		clearTimeout(checkEmailTaken.timeout);

		if (cancelTokenSourceRef.current) {
			cancelTokenSourceRef.current.cancel();
			cancelTokenSourceRef.current = undefined;
		}
	});

	useEffect(() => cancelEmailTakenCheck, [cancelEmailTakenCheck]);

	useOnChange(email, () => {
		cancelEmailTakenCheck();

		if (!validEmail) {
			return;
		}

		checkEmailTaken(email as EmailString);

		if (emailTaken !== undefined) {
			// The email has changed, so whether it's taken is now loading.
			setEmailTaken(undefined);
		}
	}, { countFirstRender: true });

	const emailTakenGridRow = validEmail && emailTaken && (
		<EmailTakenGridRow />
	);

	return { emailInputRef, emailTakenGridRow };
};

export default useEmailTaken;
