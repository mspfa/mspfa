export type Theme = 'standard' | 'dark' | 'felt' | 'sah';

export const setTheme = (theme: Theme = 'standard') => {
	// @client-only {
	document.documentElement.className = document.documentElement.className.replace(
		/(^| )theme-\w+( |$)/g,
		`$1theme-${theme}$2`
	);
	// @client-only }
};