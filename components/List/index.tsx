import './styles.module.scss';
import type { Key } from 'react';

/** What every `Listing`'s props must extend if it is to be passed into a `List`. */
export type ListingPropsBase = {
	children: { id: Key },
	listing?: never
};

export type ListProps<
	ListingProps extends ListingPropsBase,
	ForbiddenListingProps extends string = keyof ListingPropsBase
> = {
	children: Array<ListingProps['children']>,
	/** The component used to render items in the `List`. */
	listing: ((props: ListingProps) => JSX.Element) & {
		/** The `className` of the `List`. */
		listClassName: string
	}
} & Omit<ListingProps, ForbiddenListingProps>;

const List = <
	ListingProps extends ListingPropsBase,
	ForbiddenListingProps extends string = keyof ListingPropsBase
>({
	children,
	listing: Listing,
	...props
}: ListProps<ListingProps, ForbiddenListingProps>) => (
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