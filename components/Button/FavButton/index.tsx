import './styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import { useRef, useState } from 'react';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useUser } from 'lib/client/reactContexts/UserContext';
import api from 'lib/client/api';
import type { APIClient } from 'lib/client/api';
import type { StoryID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import classes from 'lib/client/classes';
import promptSignIn from 'lib/client/promptSignIn';

type UserFavAPI = APIClient<typeof import('pages/api/users/[userID]/favs/[storyID]').default>;

export type FavButtonProps = Omit<ButtonProps, 'onClick' | 'title' | 'children'> & {
	storyID: StoryID,
	/** The story's fav count. */
	children?: integer
};

const FavButton = ({ storyID, className, children, ...props }: FavButtonProps) => {
	const [user, setUser] = useUser();

	const [favCount, setFavCount] = useState(children);

	const favIndex = user?.favs.indexOf(storyID);

	/** Whether the user has the story favorited. */
	const active = favIndex !== undefined && favIndex !== -1;

	/** A ref to whether a request to favorite or unfavorite is currently loading. */
	const loadingRef = useRef(false);

	return (
		<Button
			icon
			className={classes('fav-button', { active }, className)}
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
						promptSignIn({
							title: 'Add to Favorites',
							content: 'Sign in to save your favorites!'
						});
						return;
					}

					loadingRef.current = true;

					await (api as UserFavAPI).put(`/users/${user.id}/favs/${storyID}`, !active).finally(() => {
						loadingRef.current = false;
					});

					// TODO: Don't mutate `user.favs`.
					if (active) {
						user.favs.splice(favIndex, 1);
					} else {
						user.favs.push(storyID);
					}

					setUser({ ...user });

					if (favCount !== undefined) {
						if (active) {
							setFavCount(favCount - 1);
						} else {
							setFavCount(favCount + 1);
						}
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
