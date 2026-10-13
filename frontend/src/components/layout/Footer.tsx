import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <footer className="research-footer">
      <div>
        <strong>MetroViz</strong>
        <span>城市轨道交通 · 历史资料研究</span>
      </div>
      <div>
        <span>数据来源 MetroDB</span>
        <Link to="/about">指标与来源说明 ↗</Link>
        <a
          href="https://github.com/threeMoreTime/MAP"
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
      </div>
    </footer>
  );
}
