import './styles.module.scss';
import type { Key } from 'react';

export type ListProps<
	ListingProps extends {
		children: { id: Key, listing?: never }
	}
> = {
	children: Array<ListingProps['children']>,
	listing: ((props: ListingProps) => JSX.Element) & {
		/** The `className` of the `List`. */
		listClassName: string
	}
} & Omit<ListingProps, 'children' | 'listing'>;

const List = <
	ListingProps extends {
		children: { id: Key, listing?: never }
	}
>({
	children,
	listing: Listing,
	...props
}: ListProps<ListingProps>) => (
	<div className={`list ${Listing.listClassName}`}>
		{children.map(child => (
			<Listing
				key={child.id}
				// Remove the `as any` if you dare. I cannot figure out a fix for this TS error.
				{...props as any}
			>
				{child}
			</Listing>
		))}
	</div>
);

export default List;