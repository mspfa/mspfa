import './styles.module.scss';
import type { TextareaHTMLAttributes } from 'react';
import React, { useRef, useMemo } from 'react';
import BBTool from 'components/BBCode/BBTool';
import type { BBCodeProps } from 'components/BBCode';
import BBCode from 'components/BBCode';
import Spoiler from 'components/Spoiler';
import { Field, useField } from 'formik';
import { toKebabCase } from 'modules/client/utilities';
import { usePrefixedID } from 'modules/client/IDPrefix';

export type TextAreaRef = React.MutableRefObject<HTMLTextAreaElement>;

export const TextAreaRefContext = React.createContext<{
	textAreaRef: TextAreaRef,
	/** A function which sets the value of the text area. */
	setValue: (value: string) => void
}>(undefined!);

export type BBFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'value'> & {
	name: string
} & Omit<BBCodeProps, 'children'>;

/** A text area field that accepts BBCode. */
const BBField = ({ name, html, noBB, raw, ...props }: BBFieldProps) => {
	const [, { value }, { setValue }] = useField<string>(name);
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
					<BBTool tag="spoiler" />
					<BBTool tag="chat" />
					<BBTool tag="alt" />
				</span>
				<span className="bb-tool-group">
					<BBTool tag="img" />
					<BBTool tag="youtube" />
					<BBTool tag="iframe" />
					<BBTool tag="flash" />
				</span>
			</div>
			<Field
				as="textarea"
				id={usePrefixedID(`field-${toKebabCase(name)}`)}
				name={name}
				innerRef={textAreaRef}
				{...props}
			/>
			<Spoiler
				className="bb-preview"
				open="Show Preview"
				close="Hide Preview"
				initialOpen={false}
			>
				<BBCode html={html} noBB={noBB} raw={raw}>
					{value}
				</BBCode>
			</Spoiler>
		</TextAreaRefContext.Provider>
	);
};

export default BBField;