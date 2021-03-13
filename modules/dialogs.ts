export type DialogActionData = {
	label: string,
	callback: () => void
};

export type DialogData = {
	id: number | string,
	title: string,
	content: JSX.Element,
	actions: DialogActionData[]
};