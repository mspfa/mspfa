/** Returns a boolean for whether a keyboard control should be ignored. */
const shouldIgnoreControl = () => (
	!!document.activeElement && (
		// Check if the element currenly in focus has a `select` method, which means it's a text input.
		(document.activeElement as any).select instanceof Function
		// Check if it's a `contentEditable` element.
		|| (document.activeElement as HTMLElement).contentEditable === 'true'
	)
);

export default shouldIgnoreControl;