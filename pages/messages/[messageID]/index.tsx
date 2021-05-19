import Page from 'components/Page';
import { withErrorPage } from 'modules/client/errors';
import { withStatusCode } from 'modules/server/errors';
import Box from 'components/Box';
import BoxSection from 'components/Box/BoxSection';
import { Perm } from 'modules/client/perms';
import { getClientMessage, getMessageByUnsafeID } from 'modules/server/messages';
import type { ClientMessage } from 'modules/client/messages';
import BBCode from 'components/BBCode';

type ServerSideProps = {
	message: ClientMessage
} | {
	statusCode: number
};

const Component = withErrorPage<ServerSideProps>(({ message }) => (
	<Page flashyTitle heading="Message">
		<Box>
			<BoxSection heading={message.subject}>
				<BBCode html>
					{message.content}
				</BBCode>
			</BoxSection>
		</Box>
	</Page>
));

export default Component;

export const getServerSideProps = withStatusCode<ServerSideProps>(async ({ req, params }) => {
	const messageFromParams = await getMessageByUnsafeID(params.messageID);

	if (!messageFromParams) {
		return { props: { statusCode: 404 } };
	}

	if (!(
		req.user && (
			req.user._id.equals(messageFromParams.from)
			|| messageFromParams.to.some(userID => userID.equals(req.user!._id))
			|| req.user.perms & Perm.sudoRead
		)
	)) {
		return { props: { statusCode: 403 } };
	}

	return {
		props: {
			message: getClientMessage(messageFromParams)
		}
	};
});