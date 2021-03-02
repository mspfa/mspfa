declare global {
	namespace NodeJS {
		interface ProcessEnv {
			DB_HOST: string
		}
	}
}

export {};