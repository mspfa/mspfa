// This module's exports are exposed to the client as a global object called `MSPFA`.

export { default as api } from 'modules/client/api';
export { Dialog } from 'modules/client/dialogs';
export { default as loadScript } from 'modules/client/loadScript';
export { getUser, signIn, signOut, setUserMerge, getUserMerge } from 'modules/client/users';
export { startLoading, stopLoading } from 'components/LoadingIndicator';
export { default as BBTags } from 'components/BBCode/BBTags';