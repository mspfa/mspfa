import useSWR from 'swr';
import Stick from './Stick';
import Link from './Link';

const Footer = () => {
	const footer = useSWR('/api/footer').data;
	return (
		<>
			<footer>
				<div className="mspface-container">
					<div className="mspface" style={footer && { backgroundImage: `url(/images/footers/${footer.name})` }} />
					<div className="wealth-spawner-container" />
				</div>
			</footer>
			<div id="legal">
				<span id="copyright">© MS Paint Fan Adventures 2010-{(new Date()).getFullYear()}</span>
				<Stick nix />
				<Link href="/privacy" target="_blank">Privacy Policy</Link>
				<Stick />
				<Link href="/terms">Terms of Service</Link>
				<Link className="no-decoration" href="https://www.youtube.com/watch?v=PjxV0jMpS34" target="_blank">
					<Stick />
				</Link>
			</div>
		</>
	);
};
export default Footer;