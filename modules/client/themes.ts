export type Theme = 'standard' | 'dark' | 'felt' | 'sbahj' | 'trickster';

export const setTheme = (theme: Theme = 'standard') => {
	// @client-only {
	document.documentElement.className = document.documentElement.className.replace(
		/(?<=^| )theme-\w+(?= |$)/g,
		`theme-${theme}`
	);
	// @client-only }
};