import type { ReactNode } from 'react';
import { Fragment } from 'react';

export type DelimitProps = {
	children?: JSX.Element | Array<JSX.Element | false | undefined | null | ''>,
	/** The element to delimit this component's children with. */
	with: ReactNode
};

/**
 * ⚠️ To avoid unnecessary virtual DOM complexity, please use this sparingly.
 *
 * Inserts the delimiter element set in the `with` prop between each child of this component.
 *
 * Each child has a `key` prop which defaults to its `id` prop, or to its index in this component's children if its `id` is undefined.
 *
 * Example:
 * ```
 * <Delimit with={<span className="delimiter"> | </span>}>
 * 	<span>example 1</span>
 * 	{false}
 * 	<span>example 2</span>
 * 	<span key="my-key">example 3</span>
 * </Delimit>
 * ```
 *
 * Example output:
 * ```
 * <>
 * 	{[
 * 		<Fragment key={0}>
 * 			<span>example 1</span>
 * 		</Fragment>,
 * 		<Fragment key={1}>
 * 			<span className="delimiter"> | </span>
 * 			<span>example 2</span>
 * 		</Fragment>,
 * 		<Fragment key="my-key">
 * 			<span className="delimiter"> | </span>
 * 			<span>example 3</span>
 * 		</Fragment>
 * 	]}
 * </>
 * ```
 */
const Delimit = ({ children = [], with: delimiter }: DelimitProps) => (
	<>
		{(Array.isArray(children)
			? (children.filter(Boolean) as JSX.Element[]).map((child, i) => (
				<Fragment
					key={
						child.key === null
							// If no `key` is defined on this child component, default to its `id` prop instead, or if that's undefined too, default to the index of the child.
							? child.props.id || i
							: child.key
					}
				>
					{i !== 0 && delimiter}
					{child}
				</Fragment>
			))
			: children
		)}
	</>
);

export default Delimit;