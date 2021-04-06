import useSWR from 'swr';
import Stick from 'components/Stick';
import Link from 'components/Link';
import './styles.module.scss';

const Footer = () => {
	const footers: string[] | undefined = useSWR('/api/footers').data;
	const footer = footers && footers[Math.floor(Math.random() * footers.length)];
	
	return (
		<>
			<footer>
				<div className="mspface-container">
					{footer && (
						<style jsx global>{`
							footer .mspface {
								background-image: url(/images/footers/${footer});
							}
						`}</style>
					)}
					<div className="mspface layer-front" />
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