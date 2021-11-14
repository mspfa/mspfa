import type { FormikProps } from 'formik';
import { useEffect, useRef } from 'react';

/**
 * Submits a form when the user presses `ctrl`+`S` or `⌘`+`S` if it's dirty and valid.
 *
 * Returns a ref which must be passed into the form element.
 */
const useSubmitOnSave = (
	/** The form's Formik props (or alternatively, an object of at least the `submitForm` and `dirty` props). */
	formikProps: Pick<FormikProps<any>, 'submitForm' | 'dirty'>,
	/** Whether the hook should be active (i.e. whether it should listen to save attempts). Defaults to `true`. */
	shouldSubmit = true
) => {
	const formikPropsRef = useRef(formikProps);
	formikPropsRef.current = formikProps;

	const formRef = useRef<HTMLFormElement>(null!);

	useEffect(() => {
		if (!shouldSubmit) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey) {
				// If the user is holding `alt`, let the browser handle it.
				return;
			}

			// Check for `ctrl`+`S` or `⌘`+`S`.
			if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
				event.preventDefault();

				// Ensure the form is dirty and valid.
				if (formikPropsRef.current.dirty && formRef.current.reportValidity()) {
					// Remember the focused element since focus may be lost due to `isSubmitting` causing it to be `disabled`.
					const initialActiveElement = document.activeElement as (
						Element & { focus?: HTMLElement['focus'] }
					) | null;

					formikPropsRef.current.submitForm().then(() => {
						// Restore focus to the `initialActiveElement` if possible.
						initialActiveElement?.focus?.();
					});
				}
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [shouldSubmit]);

	return formRef;
};

export default useSubmitOnSave;