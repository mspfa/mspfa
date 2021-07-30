/** Returns a boolean for whether a keyboard control should be ignored. */
const shouldIgnoreControl = () => (
	// Check if the element currenly in focus has a `select` method i.e. if it is a text input.
	(document.activeElement as any)?.select instanceof Function
);

export default shouldIgnoreControl;