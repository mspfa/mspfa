/* eslint-disable @typescript-eslint/consistent-type-definitions */

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			DB_HOST: string
		}
	}
}

export {};