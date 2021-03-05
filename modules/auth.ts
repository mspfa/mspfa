export type AuthMethod = {
	type: keyof typeof authMethods,
	value: string
};

export const authMethods = {
	password: () => {},
	google: () => {},
	discord: () => {}
};