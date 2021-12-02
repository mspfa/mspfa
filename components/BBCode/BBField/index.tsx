import './styles.module.scss';
import type { MutableRefObject, TextareaHTMLAttributes } from 'react';
import React, { useRef, useMemo } from 'react';
import BBTool from 'components/BBCode/BBTool';
import type { ParseBBCodeOptions } from 'lib/client/parseBBCode';
import BBCode from 'components/BBCode';
import Spoiler from 'components/Spoiler';
import { Field, useField } from 'formik';
import toKebabCase from 'lib/client/toKebabCase';
import { usePrefixedID } from 'lib/client/reactContexts/IDPrefix';

export const BBFieldContext = React.createContext<{
	/** A ref to the `BBField`'s text area element. */
	textAreaRef: MutableRefObject<HTMLTextAreaElement>,
	/** A function which sets the value of the text area. */
	setValue: (value: string) => void,
	/** Whether changes to the `BBField`'s value should be disallowed. */
	disabled?: boolean
} | undefined>(undefined);

export type BBFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'value'> & {
	name: string
} & ParseBBCodeOptions;

/** A text area field that accepts BBCode. */
const BBField = ({ name, keepHTMLTags, escapeHTML, removeBBTags, ...props }: BBFieldProps) => {
	const [, { value }, { setValue }] = useField<string>(name);

	const textAreaRef = useRef<HTMLTextAreaElement>(null!);

	const disableBBTools = props.disabled || props.readOnly;

	return (
		<BBFieldContext.Provider
			value={
				useMemo(() => ({
					textAreaRef,
					setValue,
					disabled: disableBBTools
				}), [textAreaRef, disableBBTools, setValue])
			}
		>
			<div className="bb-toolbar">
				<span className="bb-tool-group bb-tool-group-font-primary">
					<BBTool tag="b" />
					<BBTool tag="i" />
					<BBTool tag="u" />
					<BBTool tag="s" />
				</span>
				<span className="bb-tool-group bb-tool-group-font-secondary">
					<BBTool tag="color" />
					<BBTool tag="background" />
					<BBTool tag="size" />
					<BBTool tag="font" />
				</span>
				<span className="bb-tool-group bb-tool-group-align">
					<BBTool tag="left" />
					<BBTool tag="center" />
					<BBTool tag="right" />
					<BBTool tag="justify" />
				</span>
				<span className="bb-tool-group bb-tool-group-utility">
					<BBTool tag="url" />
					<BBTool tag="spoiler" />
					<BBTool tag="chat" />
					<BBTool tag="alt" />
				</span>
				<span className="bb-tool-group bb-tool-group-media">
					<BBTool tag="img" />
					<BBTool tag="video" />
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
				name="BBCode Preview"
				defaultOpen={false}
			>
				<BBCode
					// This key is here to force the preview to fully reset when the value changes.
					key={value}
					keepHTMLTags={keepHTMLTags}
					escapeHTML={escapeHTML}
					removeBBTags={removeBBTags}
				>
					{value}
				</BBCode>
			</Spoiler>
		</BBFieldContext.Provider>
	);
};

export default BBField;