import './styles.module.scss';
import type { ReactElement } from 'react';
import React, { useRef, useMemo } from 'react';
import BBToolbarButton from 'components/BBToolbar/BBToolbarButton';

export type TextAreaRef = React.MutableRefObject<HTMLTextAreaElement>;

export const TextAreaRefContext = React.createContext<{
	textAreaRef: TextAreaRef,
	setValue: BBToolbarProps['setValue']
}>(undefined!);

export type BBToolbarProps = {
	/** The component to pass a `textarea` ref to. */
	children: ReactElement<{
		innerRef: TextAreaRef
	}>,
	setValue: (value: string) => void
};

/** Gives the child text area a BBCode toolbar. */
const BBToolbar = ({ setValue, children }: BBToolbarProps) => {
	const textAreaRef = useRef<HTMLTextAreaElement>(null!);

	return (
		<TextAreaRefContext.Provider
			value={
				useMemo(() => ({ textAreaRef, setValue }), [textAreaRef, setValue])
			}
		>
			<div className="bb-toolbar">
				<span className="bb-toolbar-group">
					<BBToolbarButton tag="b" />
					<BBToolbarButton tag="i" />
					<BBToolbarButton tag="u" />
					<BBToolbarButton tag="s" />
				</span>
				<span className="bb-toolbar-group">
					<BBToolbarButton tag="color" />
					<BBToolbarButton tag="background" />
				</span>
				<span className="bb-toolbar-group">
					<BBToolbarButton tag="size" />
					<BBToolbarButton tag="font" />
				</span>
				<span className="bb-toolbar-group">
					<BBToolbarButton tag="left" />
					<BBToolbarButton tag="center" />
					<BBToolbarButton tag="right" />
					<BBToolbarButton tag="justify" />
				</span>
				<span className="bb-toolbar-group">
					<BBToolbarButton tag="url" />
					<BBToolbarButton tag="img" />
					<BBToolbarButton tag="alt" />
					<BBToolbarButton tag="spoiler" />
				</span>
			</div>
			{React.cloneElement(children, {
				innerRef: textAreaRef
			})}
		</TextAreaRefContext.Provider>
	);
};

export default BBToolbar;