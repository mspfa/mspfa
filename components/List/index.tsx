import './styles.module.scss';
import type { Key } from 'react';

export type ListProps<ListingData extends { id: Key }> = {
	children: ListingData[],
	listing: (
		(
			(props: { children: ListingData }) => JSX.Element
		) & {
			/** The `className` of the `List`. */
			listClassName: string
		}
	)
};

const List = <Child extends { id: Key }>({
	children,
	listing: Listing
}: ListProps<Child>) => (
	<div className={`list ${Listing.listClassName}`}>
		{children.map(child => (
			<Listing key={child.id}>
				{child}
			</Listing>
		))}
	</div>
);

export default List;