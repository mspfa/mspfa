import './styles.module.scss';
import DOMPurify from 'isomorphic-dompurify';

DOMPurify.setConfig({
	// Allow external protocol handlers in URL attributes.
	ALLOW_UNKNOWN_PROTOCOLS: true,
	// Prevent unintuitive browser behavior in several edge cases.
	FORCE_BODY: true,
	// Disable DOM clobbering protection on output.
	SANITIZE_DOM: false
});

export type BBCodeProps = {
	/** Whether HTML should be allowed and parsed. */
	html?: boolean,
	children?: string
};

/** A component which parses its `children` string as BBCode. */
const BBCode = ({
	html = false,
	children = ''
}: BBCodeProps) => (
	<span
		className="bbcode"
		dangerouslySetInnerHTML={{
			__html: DOMPurify.sanitize(children)
		}}
	/>
);

export default BBCode;