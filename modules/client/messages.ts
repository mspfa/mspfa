import type { ServerMessage } from 'modules/server/messages';

export type ClientMessage = Pick<ServerMessage, 'subject' | 'content'> & {
	id: string,
	sent: number,
	edited?: number,
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