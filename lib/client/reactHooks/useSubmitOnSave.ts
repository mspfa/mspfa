import type { FormikProps } from 'formik';
import { useEffect, useRef } from 'react';

/**
 * Submits a form when the user presses `ctrl`+`S` or `⌘`+`S` if it's dirty, valid, and not already submitting.
 *
 * Returns a ref which must be passed into the form element.
 */
const useSubmitOnSave = (
	/** The form's Formik props, or an object of at least the `submitForm`, `dirty`, and `isSubmitting` Formik props. */
	formikProps: Pick<FormikProps<any>, 'submitForm' | 'dirty' | 'isSubmitting'>,
	/** Whether the hook should be active (i.e. whether it should listen for save attempts). Defaults to `true`. */
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

				if (
					formikPropsRef.current.dirty
					&& formRef.current.reportValidity()
					&& !formikPropsRef.current.isSubmitting
				) {
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