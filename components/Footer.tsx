import useSWR from 'swr';
import Stick from './Stick';
import Link from './Link';

const Footer = () => {
	const footer = useSWR('/api/footer').data;
	return (
		<>
			<footer>
				<div className="mspface-container">
					{footer && (
						<style jsx global>{`
							footer .mspface {
								background-image: url(/images/footers/${footer.name});
							}
						`}</style>
					)}
					<div className="mspface" />
					<div className="wealth-spawner-container" />
				</div>
			</footer>
			<div id="legal">
				<span id="copyright">© MS Paint Fan Adventures 2010-{(new Date()).getFullYear()}</span>
				<Stick nix />
				<Link href="/privacy" target="_blank">Privacy Policy</Link>
				<Stick />
				<Link href="/terms" target="_blank">Terms of Service</Link>
			</div>
		</>
	);
};
export default Footer;