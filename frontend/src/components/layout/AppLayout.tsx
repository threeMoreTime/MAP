import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import Header from "./Header";
import MetroDataProvider from "../research/MetroDataProvider";
import Footer from "./Footer";
import { useMotion } from "../../hooks/useResearch";

export default function AppLayout() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { reduced } = useMotion();
  const location = useLocation();
  const navigation = useNavigationType();
  const positions = useRef(new Map<string, number>());
  useEffect(() => {
    const online = () => setIsOffline(false),
      offline = () => setIsOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  useEffect(() => {
    const path = location.pathname;
    const previous = positions.current;
    if (navigation !== "REPLACE")
      window.scrollTo(0, navigation === "POP" ? previous.get(path) || 0 : 0);
    return () => {
      previous.set(path, window.scrollY);
    };
  }, [location.pathname, navigation]);
  return (
    <MetroDataProvider>
      <div className="research-app" data-reduced-motion={reduced}>
        {isOffline && (
          <div className="offline-banner" role="status">
            网络已断开，未加载的资料可能暂不可用。已显示的内容仍可查阅。
          </div>
        )}
        <Header />
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </MetroDataProvider>
  );
}
