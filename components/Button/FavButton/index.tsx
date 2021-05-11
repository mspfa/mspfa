import './styles.module.scss';
import 'components/LabeledIcon/styles.module.scss';
import Button from 'components/Button';
import type { ButtonProps } from 'components/Button';
import { useCallback } from 'react';

export type FavButtonProps = Omit<ButtonProps, 'onClick' | 'title'> & {
	storyID: number
};

const FavButton = ({ className, ...props }: FavButtonProps) => (
	<Button
		className={`labeled-icon heart${className ? ` ${className}` : ''}`}
		title="Favorite"
		onClick={
			useCallback(() => {
				// TODO
			}, [])
		}
		{...props}
	/>
);

export default FavButton;