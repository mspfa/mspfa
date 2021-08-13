import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import { useState } from 'react';
import useFunction from 'lib/client/useFunction';
import { setUser, promptSignIn, useUser } from 'lib/client/users';
import api from 'lib/client/api';
import type { APIClient, APIError } from 'lib/client/api';
import Dialog from 'lib/client/Dialog';
import type { StoryID } from 'lib/server/stories';
import type { integer } from 'lib/types';

type FavsAPI = APIClient<typeof import('pages/api/users/[userID]/favs').default>;
type FavAPI = APIClient<typeof import('pages/api/users/[userID]/favs/[storyID]').default>;

export type FavButtonProps = Omit<ButtonProps, 'onClick' | 'title' | 'children'> & {
	storyID: StoryID,
	children: integer
};

const FavButton = ({ storyID, className, children, ...props }: FavButtonProps) => {
	const user = useUser();
	const [loading, setLoading] = useState(false);
	const [favCount, setFavCount] = useState(children);

	const favIndex = user?.favs.indexOf(storyID);

	/** Whether the user has the story favorited. */
	const active = favIndex !== undefined && favIndex !== -1;

	return (
		<Button
			icon
			className={`fav-button${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
			title={`${favCount} Favorite${favCount === 1 ? '' : 's'}`}
			onClick={
				useFunction(async () => {
					if (loading) {
						return;
					}

					if (!user) {
						// If `user` is undefined, this component cannot posibly be `active`, which means the user is trying to add a favorite without being signed in.

						if (await Dialog.confirm({
							id: 'fav',
							title: 'Add to Favorites',
							content: 'Sign in to save your favorites!',
							actions: ['Sign In', 'Cancel']
						})) {
							promptSignIn();
						}

						return;
					}

					setLoading(true);

					let newFavCount: integer;

					if (active) {
						({ data: { favCount: newFavCount } } = await (api as FavAPI).delete(`/users/${user.id}/favs/${storyID}`, {
							beforeInterceptError: error => {
								if (error.response?.status === 404) {
									// The favorite was not found, so cancel the error and remove the favorite on the client.

									error.preventDefault();
								}
							}
						}).catch((error: APIError) => {
							if (error.defaultPrevented) {
								return { data: { favCount: favCount - 1 } };
							}

							return Promise.reject(error);
						}));

						user.favs.splice(favIndex, 1);
						setUser({ ...user });
					} else {
						({ data: { favCount: newFavCount } } = await (api as FavsAPI).post(`/users/${user.id}/favs`, { storyID }, {
							beforeInterceptError: error => {
								if (error.response?.data.error === 'ALREADY_EXISTS') {
									// The favorite was not found, so cancel the error and remove the favorite on the client.

									error.preventDefault();
								}
							}
						}).catch((error: APIError) => {
							if (error.defaultPrevented) {
								return { data: { favCount: favCount + 1 } };
							}

							return Promise.reject(error);
						}));

						user.favs.push(storyID);
						setUser({ ...user });
					}

					setFavCount(newFavCount);
					setLoading(false);
				})
			}
			{...props}
		>
			{favCount}
		</Button>
	);
};

export default FavButton;