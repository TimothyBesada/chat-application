import "~/styles/globals.css";
import type { AppType } from "next/app";
import { trpc } from "~/utils/trpc";

const MyApp: AppType = ({ Component, pageProps }) => {
  return <Component {...pageProps} />;
};

MyApp.getInitialProps = async () => {
  return {};
};

export default trpc.withTRPC(MyApp);
