import type { InternalAuthMethod, ExternalAuthMethod } from 'lib/server/users';

export type InternalAuthMethodOptions = Pick<InternalAuthMethod, 'type' | 'value'>;
export type ExternalAuthMethodOptions = Pick<ExternalAuthMethod, 'type' | 'value'>;
export type AuthMethodOptions = InternalAuthMethodOptions | ExternalAuthMethodOptions;

export type ClientInternalAuthMethod = Pick<InternalAuthMethod, 'id' | 'type' | 'name'>;
export type ClientExternalAuthMethod = Pick<ExternalAuthMethod, 'id' | 'type' | 'name'>;
export type ClientAuthMethod = ClientInternalAuthMethod | ClientExternalAuthMethod;

/** The display names of auth method types. */
export const authMethodTypeNames: Record<ClientAuthMethod['type'], string> = {
	password: 'Password',
	google: 'Google',
	discord: 'Discord'
};