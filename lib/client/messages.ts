import type { ServerMessage } from 'lib/server/messages';
import type { DateNumber } from 'lib/types';

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