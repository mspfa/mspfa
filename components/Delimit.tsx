import { Fragment } from 'react';

/**
 * Inserts the delimiter element set in the `with` prop between each child of this component.
 * 
 * This component's props are spread to each inserted delimiter.
 * 
 * Each child has a `key` prop which defaults to its index in this component's children.
 * 
 * Example:
 * ```
 * <Delimit with={Stick} className="my-delimiter">
 *     <span>example 1</span>
 *     <span>example 2</span>
 *     <span key="my-key">example 3</span>
 * </Delimit>
 * ```
 * 
 * Approximate output:
 * ```
 * <Fragment key={0}>
 *     <span>example 1</span>
 *     <Stick className="my-delimiter" />
 * </Fragment>
 * <Fragment key={1}>
 *     <span>example 2</span>
 *     <Stick className="my-delimiter" />
 * </Fragment>
 * <Fragment key="my-key">
 *     <span>example 3</span>
 * </Fragment>
 * ```
 */
const Delimit = <DelimiterType extends (props: any) => JSX.Element>(
	{ children, with: Delimiter, ...props }: {
		children: JSX.Element | JSX.Element[],
		/** The element to delimit this component's children with. */
		with: DelimiterType
	} & Omit<Parameters<DelimiterType>[0], 'children' | 'with'>
) =>
	Array.isArray(children)
		? (
			<>
				{children.map((child, index) => (
					<Fragment
						key={child.key === null ? index : child.key}
					>
						{child}
						{index !== children.length - 1 && <Delimiter {...props as any} />}
					</Fragment>
				))}
			</>
		)
		: <>{children}</>;

export default Delimit;