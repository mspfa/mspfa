import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import { useRef, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { setUser, useUser } from 'lib/client/reactContexts/UserContext';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import Dialog from 'lib/client/Dialog';
import type { StoryID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import promptSignIn from 'lib/client/promptSignIn';

type UserFavAPI = APIClient<typeof import('pages/api/users/[userID]/favs/[storyID]').default>;

export type FavButtonProps = Omit<ButtonProps, 'onClick' | 'title' | 'children'> & {
	storyID: StoryID,
	/** The story's fav count. */
	children?: integer
};

const FavButton = ({ storyID, className, children, ...props }: FavButtonProps) => {
	const user = useUser();

	const [favCount, setFavCount] = useState(children);

	const favIndex = user?.favs.indexOf(storyID);

	/** Whether the user has the story favorited. */
	const active = favIndex !== undefined && favIndex !== -1;

	/** A ref to whether a request to favorite or unfavorite is currently loading. */
	const loadingRef = useRef(false);

	return (
		<Button
			icon
			className={`fav-button${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
			title={
				favCount === undefined
					? active
						? 'Unfavorite'
						: 'Favorite'
					: `${favCount} Favorite${favCount === 1 ? '' : 's'}`
			}
			onClick={
				useFunction(async () => {
					if (loadingRef.current) {
						return;
					}

					if (!user) {
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

					loadingRef.current = true;

					await (api as UserFavAPI).put(`/users/${user.id}/favs/${storyID}`, !active).finally(() => {
						loadingRef.current = false;
					});

					if (active) {
						user.favs.splice(favIndex, 1);
					} else {
						user.favs.push(storyID);
					}

					setUser({ ...user });

					if (favCount !== undefined) {
						setFavCount(favCount + (active ? -1 : 1));
					}
				})
			}
			{...props}
		>
			{favCount}
		</Button>
	);
};

export default FavButton;