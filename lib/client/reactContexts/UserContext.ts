import type { Dispatch, SetStateAction } from 'react';
import React, { useContext } from 'react';
import type { PrivateUser } from 'lib/client/users';

export type UserContextType<
	User extends PrivateUser | undefined = PrivateUser | undefined
> = [
	User,
	Dispatch<SetStateAction<PrivateUser | undefined>>
];

/** A context for the state of the current authenticated user. */
const UserContext = React.createContext<UserContextType>(undefined as never);

export default UserContext;

/** A state hook for the current authenticated user. */
export const useUser = <NonNullableUser extends boolean = boolean>() => (
	useContext(UserContext) as (
		NonNullableUser extends true
			? UserContextType<PrivateUser>
			: UserContextType
	)
);
