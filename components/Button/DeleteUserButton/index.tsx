import Button from 'components/Button';
import { Field, useFormikContext } from 'formik';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import Dialog from 'components/Dialog';
import { preventReloads } from 'lib/client/errors';
import { preventLeaveConfirmations } from 'lib/client/forms';
import { useUser } from 'lib/client/reactContexts/UserContext';
import useFunction from 'lib/client/reactHooks/useFunction';
import useLatest from 'lib/client/reactHooks/useLatest';
import type { PrivateUser } from 'lib/client/users';
import Router from 'next/router';
import Action from 'components/Dialog/Action';

type UserAPI = APIClient<typeof import('pages/api/users/[userID]').default>;
type UserDoesOwnStoriesAPI = APIClient<typeof import('pages/api/users/[userID]/does-own-stories').default>;

export type DeleteUserButtonProps = {
	privateUser: PrivateUser
};

const DeleteUserButton = ({ privateUser }: DeleteUserButtonProps) => {
	const [user, setUser] = useUser<true>();
	const userRef = useLatest(user);

	const { isSubmitting, setSubmitting } = useFormikContext();

	return (
		<Button
			disabled={isSubmitting}
			onClick={
				useFunction(async () => {
					setSubmitting(true);

					const { data: doesOwnStories } = await (api as UserDoesOwnStoriesAPI).get(`/users/${privateUser.id}/does-own-stories`).catch(error => {
						setSubmitting(false);
						return Promise.reject(error);
					});

					setSubmitting(false);

					if (doesOwnStories) {
						Dialog.create(
							<Dialog id="delete-user" title="Delete Account">
								If you want to delete your account, first delete or transfer ownership of each of the adventures you own.
							</Dialog>
						);
						return;
					}

					if (!await Dialog.confirm(
						<Dialog
							id="delete-user"
							title="Delete Account"
							initialValues={{ confirmed: false }}
						>
							{({ values: { confirmed } }) => (
								<>
									Are you sure you want to delete your account?<br />
									<br />
									Your account will be restored if you sign into it within 30 days after deletion.<br />
									<br />
									After 30 days, <span className="bolder red">the deletion is irreversible.</span><br />
									<br />
									<label>
										<Field
											type="checkbox"
											name="confirmed"
											className="spaced"
											required
											autoFocus
										/>
										<span className="spaced bolder">
											I am sure I want to delete my account: <i>{privateUser.name}</i>
										</span>
									</label>

									<Action disabled={!confirmed}>
										Yes
									</Action>
									{Action.NO}
								</>
							)}
						</Dialog>
					)) {
						return;
					}

					setSubmitting(true);

					await (api as UserAPI).delete(`/users/${privateUser.id}`).catch(error => {
						setSubmitting(false);
						return Promise.reject(error);
					});

					if (userRef.current.id === privateUser.id) {
						// We don't want to reload when they sign out; we want to go to the homepage.
						preventReloads();
						setUser(undefined);
					}

					preventLeaveConfirmations();
					Router.push('/');
				})
			}
		>
			Delete Account
		</Button>
	);
};

export default DeleteUserButton;
