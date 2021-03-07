import Header from './Header';
import Main from './Main';
import type { MainProps } from './Main';
import Footer from './Footer';
import './styles/Page.module.scss';

export type PageProps = MainProps;

const Page = (props: PageProps) => (
	<div id="page">
		<Header />
		<Main {...props} />
		<Footer />
	</div>
);
export default Page;