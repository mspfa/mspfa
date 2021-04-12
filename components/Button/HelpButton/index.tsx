import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Dialog } from 'modules/client/dialogs';
import './styles.module.scss';

export type HelpButtonProps = Omit<ButtonProps, 'onClick' | 'children'> & {
	children: ReactNode
};

const HelpButton = ({ className, children, ...props }: HelpButtonProps) => (
	<Button
		className={`icon help${className ? ` ${className}` : ''}`}
		onClick={
			useCallback(() => {
				new Dialog({
					id: 'help',
					title: 'Info',
					content: children
				});
			}, [children])
		}
		{...props}
	/>
);

export default HelpButton;