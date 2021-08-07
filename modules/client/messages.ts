import type { ServerMessage } from 'modules/server/messages';
import type { DateNumber } from 'modules/types';

export type ClientMessage = Pick<ServerMessage, 'subject' | 'content'> & {
	id: string,
	sent: DateNumber,
	edited?: DateNumber,
	from: string,
	/**
	 * @minItems 1
	 * @uniqueItems true
	 */
	to: string[],
	replyTo?: string,
	/** Whether the user has marked this message as read. */
	read: boolean
};