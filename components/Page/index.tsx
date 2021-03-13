import Header from '../Header';
import type { HeaderProps } from '../Header';
import type { ReactNode } from 'react';
import Footer from '../Footer';
import Dialogs from '../Dialog/Dialogs';
import './styles.module.scss';

export type PageProps = HeaderProps & { children: ReactNode };

const Page = (props: PageProps) => (
	<>
		<div id="page">
			<Header noFlashyTitle={props.noFlashyTitle} />
			<main>
				{props.children}
			</main>
			<Footer />
		</div>
		<Dialogs />
	</>
);

export default Page;