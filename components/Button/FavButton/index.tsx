import './styles.module.scss';
import 'components/LabeledIcon/styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import { useCallback } from 'react';
import { setUser, signIn, useUser } from 'modules/client/users';
import api from 'modules/client/api';
import type { APIClient } from 'modules/client/api';
import { Dialog } from 'modules/client/dialogs';
import type { StoryID } from 'modules/server/stories';

type FavsAPI = APIClient<typeof import('pages/api/users/[userID]/favs').default>;

export type FavButtonProps = Omit<ButtonProps, 'onClick' | 'title'> & {
	storyID: StoryID
};

const FavButton = ({ storyID, className, ...props }: FavButtonProps) => {
	const user = useUser();

	const favIndex = user?.favs.indexOf(storyID);

	/** Whether the user has the story favorited. */
	const active = favIndex !== undefined && favIndex !== -1;

	return (
		<Button
			className={`labeled-icon heart${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
			title={`${active ? 'Remove from' : 'Add to'} Favorites`}
			onClick={
				useCallback(async () => {
					if (user) {
						if (active) {
							await (api as FavsAPI).delete(`/users/${user.id}/favs/${storyID}`);

							user.favs.splice(favIndex!, 1);
							setUser({ ...user });
						} else {
							(api as FavsAPI).post(`/users/${user.id}/favs`, { storyID });

							user.favs.push(storyID);
							setUser({ ...user });
						}
					} else if (await Dialog.confirm({
						id: 'fav',
						title: 'Add to Favorites',
						content: 'Sign in to save your favorites!',
						actions: ['Sign In', 'Cancel']
					})) {
						signIn();
					}

					// This ESLint comment is necessary because the rule incorrectly thinks `active` and `favIndex` should be dependencies here, despite that they depend on `user` which is already a dependency.
					// eslint-disable-next-line react-hooks/exhaustive-deps
				}, [user, storyID])
			}
			{...props}
		/>
	);
};

export default FavButton;