import './styles.module.scss';
import type { ReactElement } from 'react';
import React, { useRef, useMemo } from 'react';
import BBTool from 'components/BBCode/BBTool';
import BBCode from 'components/BBCode';
import Spoiler from 'components/Spoiler';

export type TextAreaRef = React.MutableRefObject<HTMLTextAreaElement>;

export const TextAreaRefContext = React.createContext<{
	textAreaRef: TextAreaRef,
	setValue: BBCodeFieldProps['setValue']
}>(undefined!);

export type BBCodeFieldProps = {
	/** The current value of the text area. */
	value: string,
	/** A function which sets the value of the text area. */
	setValue: (value: string) => void,
	/** The component to pass a `textarea` ref to. */
	children: ReactElement<{
		innerRef: TextAreaRef
	}>
};

/** Gives the child text area a BBCode toolbar. */
const BBCodeField = ({ value, setValue, children }: BBCodeFieldProps) => {
	const textAreaRef = useRef<HTMLTextAreaElement>(null!);

	return (
		<TextAreaRefContext.Provider
			value={
				useMemo(() => ({
					textAreaRef,
					setValue
				}), [textAreaRef, setValue])
			}
		>
			<div className="bb-toolbar">
				<span className="bb-tool-group">
					<BBTool tag="b" />
					<BBTool tag="i" />
					<BBTool tag="u" />
					<BBTool tag="s" />
				</span>
				<span className="bb-tool-group">
					<BBTool tag="color" />
					<BBTool tag="background" />
				</span>
				<span className="bb-tool-group">
					<BBTool tag="size" />
					<BBTool tag="font" />
				</span>
				<span className="bb-tool-group">
					<BBTool tag="left" />
					<BBTool tag="center" />
					<BBTool tag="right" />
					<BBTool tag="justify" />
				</span>
				<span className="bb-tool-group">
					<BBTool tag="url" />
					<BBTool tag="img" />
					<BBTool tag="alt" />
					<BBTool tag="spoiler" />
					<BBTool tag="chat" />
					<BBTool tag="youtube" />
				</span>
			</div>
			{React.cloneElement(children, {
				innerRef: textAreaRef
			})}
			<Spoiler
				open="Show Preview"
				close="Hide Preview"
				initialOpen={false}
			>
				<BBCode html>{value}</BBCode>
			</Spoiler>
		</TextAreaRefContext.Provider>
	);
};

export default BBCodeField;