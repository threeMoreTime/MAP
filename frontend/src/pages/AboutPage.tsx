import { Link } from "react-router-dom";
import { useMetroData } from "../hooks/useMetroData";
import { DataState, PageHeading } from "../components/research/WorkbenchUI";

export default function AboutPage() {
  const { manifest, loading, error } = useMetroData();
  return (
    <div className="workbench reading-page">
      <PageHeading
        eyebrow="SOURCES & METHODS"
        title="理解数字，也理解它的边界"
        description="MetroViz 是城市地铁客流研究台，整理历史客流与线网资料，帮助查阅与有依据的对照。"
      />
      <section className="research-panel reading-section">
        <h2>先区分三件事</h2>
        <dl className="definition-list">
          <dt>统计期间</dt>
          <dd>
            数值描述的日期或年份。日客流原字段未提供明确日期，界面标记为“日客流快照”。
          </dd>
          <dt>采集日期</dt>
          <dd>
            数据被抓取的时间，不代表统计时间，也不代表城市运营资料截至该日。
          </dd>
          <dt>索引生成时间</dt>
          <dd>数据文件被整理或构建的时间，不会自动使历史数据变成最新数据。</dd>
        </dl>
      </section>
      <section className="research-panel reading-section">
        <h2>指标与可比性</h2>
        <div className="research-table-wrap">
          <table className="research-table">
            <thead>
              <tr>
                <th>指标</th>
                <th>单位</th>
                <th>使用说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>年度日均客流</td>
                <td>万人次 / 日</td>
                <td>按源数据年度序列展示；系统范围和计数规则待核验。</td>
              </tr>
              <tr>
                <td>日客流快照</td>
                <td>万人次</td>
                <td>原字段统计日期未提供；不可当作实时值或与年度值混比。</td>
              </tr>
              <tr>
                <td>运营里程 / 站点</td>
                <td>km / 座</td>
                <td>独立运营资料，统计时点未提供，不默认属于当前所选年份。</td>
              </tr>
              <tr>
                <td>客流强度</td>
                <td>源口径待核验</td>
                <td>
                  不从未知期间的客流与里程推算，不解释为经营效率或拥挤度。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          严格比较需要指标、单位、期间、系统范围、计数规则一致，且来源已经核验。当前资料保留原值供查阅，尚不满足严格排名与同比分析条件。未知口径之间不能默认相等。
        </p>
        <p>
          未确认完整期间的年度记录仅列入原值表，不接入正常全年趋势。缺失不等于零；在建线路等具有明确记录的真实零保留。
        </p>
      </section>
      <section className="research-panel reading-section">
        <h2>来源与资料收录</h2>
        <p>
          统计来自{" "}
          <a href="https://metrodb.org/" target="_blank" rel="noreferrer">
            MetroDB ↗
          </a>
          ，城市来源入口依据采集配置生成。线网与规划图件的具体版本、来源和授权信息未完整收录，查看和引用前请向原发布方核实。
        </p>
        <p>
          地图仅显示城市位置及所选指标分布。三维地形高度没有数值含义，也不表示跨城客流关系。二维
          / 三维可切换，减少动态效果设置不会删减数据。
        </p>
        <Link className="quiet-button" to="/data-quality">
          查看逐城资料收录状态 →
        </Link>
      </section>
      <section className="research-panel reading-section">
        <h2>当前数据与构建</h2>
        {loading || error ? (
          <DataState loading={loading} error={error} />
        ) : (
          <dl className="definition-list">
            <dt>统计采集日</dt>
            <dd>{manifest?.stats_scrape_date || "未提供"}</dd>
            <dt>索引生成时间</dt>
            <dd>{manifest?.generated_at || "未提供"}</dd>
            <dt>数据版本</dt>
            <dd>{manifest?.version || "未提供"}</dd>
            <dt>构建提交</dt>
            <dd className="build-commit">{__BUILD_COMMIT__}</dd>
          </dl>
        )}
        <p>
          项目与需求文档：
          <a
            href="https://github.com/threeMoreTime/MAP"
            target="_blank"
            rel="noreferrer"
          >
            threeMoreTime / MAP ↗
          </a>
        </p>
      </section>
    </div>
  );
}
