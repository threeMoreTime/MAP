import { useEffect, useRef, useState } from "react";
import { echarts, type EChartsCoreOption } from "../../lib/echarts";
import { CITY_COORDS } from "../../data/cityCoords";
import type { MergedCity } from "../../hooks/useMetroData";
import { useMotion } from "../../hooks/useResearch";
import {
  formatValue,
  observe,
  RESEARCH_METRICS,
  type ResearchMetric,
} from "../../lib/research";
import { withBaseUrl } from "../../utils/path";

interface Props {
  cities: MergedCity[];
  metric: ResearchMetric;
  year: number;
  selected: string;
  onSelect: (id: string) => void;
}
const overview = { center: [0, 0, 0], distance: 105, alpha: 45, beta: -8 };

export default function ResearchMap({
  cities,
  metric,
  year,
  selected,
  onSelect,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const { reduced } = useMotion();

  useEffect(() => {
    let cancelled = false;
    const element = container.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let ro: ResizeObserver | null = null;
    const fail3d = () => {
      if (!cancelled) {
        setMode("2d");
        setMessage("三维暂不可用，已恢复二维视图。");
      }
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      fail3d();
    };
    async function init() {
      try {
        if (mode === "3d") {
          const test = document.createElement("canvas");
          const gl = test.getContext("webgl");
          if (!gl) {
            fail3d();
            return;
          }
          gl.getExtension("WEBGL_lose_context")?.loseContext();
          await import("echarts-gl");
        }
        if (!echarts.getMap("research-china")) {
          const response = await fetch(withBaseUrl("assets/china.json"), {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("map");
          const json = await response.json();
          if (cancelled) return;
          echarts.registerMap("research-china", json);
        }
        if (cancelled || !element) return;
        const instance = echarts.init(element, undefined, {
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        });
        chart.current = instance;
        const base: EChartsCoreOption =
          mode === "3d"
            ? {
                animation: false,
                backgroundColor: "transparent",
                geo3D: {
                  map: "research-china",
                  regionHeight: 1.8,
                  boxWidth: 120,
                  boxHeight: 5,
                  shading: "lambert",
                  itemStyle: {
                    color: "#9dbeb8",
                    borderColor: "#f1f8f6",
                    borderWidth: 0.7,
                  },
                  emphasis: { itemStyle: { color: "#b3d0cf" } },
                  light: {
                    main: {
                      intensity: 0.45,
                      alpha: 55,
                      beta: 20,
                      shadow: false,
                    },
                    ambient: { intensity: 0.55 },
                  },
                  viewControl: {
                    ...overview,
                    autoRotate: false,
                    panSensitivity: 0,
                    minDistance: 55,
                    maxDistance: 190,
                    animation: false,
                  },
                  postEffect: { enable: false },
                },
                series: [
                  {
                    type: "scatter3D",
                    id: "cities",
                    coordinateSystem: "geo3D",
                    data: [],
                  },
                ],
              }
            : {
                backgroundColor: "transparent",
                geo: {
                  map: "research-china",
                  roam: false,
                  layoutCenter: ["48%", "48%"],
                  layoutSize: "102%",
                  itemStyle: {
                    areaColor: "#dae8e5",
                    borderColor: "#ffffff",
                    borderWidth: 1,
                  },
                  emphasis: { disabled: true },
                  silent: true,
                },
                series: [
                  {
                    type: "scatter",
                    id: "cities",
                    coordinateSystem: "geo",
                    data: [],
                  },
                ],
              };
        instance.setOption(base);
        instance.on("click", (params) => {
          const data = params.data as { city?: string } | undefined;
          if (data?.city) selectRef.current(data.city);
        });
        element
          .querySelectorAll("canvas")
          .forEach((canvas) =>
            canvas.addEventListener("webglcontextlost", contextLost),
          );
        ro = new ResizeObserver(() => instance.resize());
        ro.observe(element);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          if (mode === "3d") fail3d();
          else setStatus("error");
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void init();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
      ro?.disconnect();
      element
        ?.querySelectorAll("canvas")
        .forEach((canvas) =>
          canvas.removeEventListener("webglcontextlost", contextLost),
        );
      chart.current?.dispose();
      chart.current = null;
    };
  }, [mode, retry]);

  useEffect(() => {
    if (status !== "ready" || !chart.current) return;
    const values = cities.map((city) => ({
      city,
      observation: observe(city, metric, year),
    }));
    const max = Math.max(...values.map((v) => v.observation.value || 0), 1);
    const data = values
      .filter((v) => CITY_COORDS[v.city.city])
      .map(({ city, observation: o }) => {
        const picked = city.city === selected;
        return {
          name: city.city_cn,
          city: city.city,
          value: [...CITY_COORDS[city.city], mode === "3d" ? 2 : o.value || 0],
          symbol: o.value === null && mode === "2d" ? "emptyCircle" : "circle",
          symbolSize:
            o.value === null
              ? 5
              : Math.max(7, Math.sqrt(o.value / max) * 30) + (picked ? 5 : 0),
          itemStyle: {
            color: picked
              ? "#bb7328"
              : o.value === null
                ? "#879b9d"
                : "#146a73",
            opacity: picked ? 1 : 0.72,
            borderColor: "#ffffff",
            borderWidth: picked ? 2 : 1,
          },
          label: {
            show: picked,
            formatter: city.city_cn,
            position: "top",
            color: "#183c42",
            fontSize: 13,
            fontWeight: 600,
            textStyle: { color: "#183c42", fontSize: 13 },
          },
          tooltip: {
            formatter: `${city.city_cn}<br/>${RESEARCH_METRICS[metric].label}：${formatValue(o.value, metric)} ${o.unit}<br/>${o.periodLabel} · ${o.reason}`,
          },
        };
      });
    try {
      chart.current.setOption({
        animation: !reduced,
        animationDurationUpdate: reduced ? 0 : 320,
        tooltip: {
          trigger: "item",
          backgroundColor: "#ffffff",
          borderColor: "#d9e2e2",
          textStyle: { color: "#182a2f", fontSize: 12 },
        },
        ...(mode === "3d"
          ? {
              geo3D: {
                viewControl: {
                  autoRotate: false,
                  animation: false,
                  animationDurationUpdate: 0,
                },
              },
            }
          : {}),
        series: [{ id: "cities", data }],
      } as EChartsCoreOption);
    } catch {
      const frame = window.requestAnimationFrame(() =>
        setMessage("空间视图更新失败，可使用城市列表。"),
      );
      return () => window.cancelAnimationFrame(frame);
    }
  }, [cities, metric, year, selected, mode, status, reduced]);

  function focus(reset = false) {
    const instance = chart.current;
    if (!instance) return;
    if (mode === "2d") {
      instance.setOption({
        geo: reset
          ? { center: null, zoom: 1 }
          : { center: CITY_COORDS[selected], zoom: 2 },
      });
      return;
    }
    try {
      // ECharts GL exposes the geographic projection through its component model.
      const model = (
        instance as unknown as {
          getModel: () => {
            getComponent: (name: string) => {
              coordinateSystem: { dataToPoint: (coords: number[]) => number[] };
            };
          };
        }
      ).getModel();
      const center = reset
        ? overview.center
        : model
            .getComponent("geo3D")
            .coordinateSystem.dataToPoint([...CITY_COORDS[selected], 0]);
      instance.setOption({
        geo3D: {
          viewControl: {
            ...(reset ? overview : { center, distance: 65, alpha: 45 }),
            animation: !reduced,
            animationDurationUpdate: reduced ? 0 : 420,
            animationEasingUpdate: "cubicOut",
          },
        },
      } as EChartsCoreOption);
    } catch {
      setMessage("当前浏览器暂不支持聚焦，可拖动三维视图。");
    }
  }

  function switchMode(next: "2d" | "3d") {
    if (next !== mode) {
      setStatus("loading");
      setMode(next);
      setMessage("");
    }
  }
  return (
    <section className="research-map">
      <div className="panel-top">
        <div>
          <span className="eyebrow">SPATIAL VIEW</span>
          <h2>城市空间分布</h2>
        </div>
        <div className="segmented" aria-label="空间视图维度">
          <button aria-pressed={mode === "2d"} onClick={() => switchMode("2d")}>
            二维
          </button>
          <button aria-pressed={mode === "3d"} onClick={() => switchMode("3d")}>
            三维 3D
          </button>
        </div>
      </div>
      <div className="map-stage">
        <div
          ref={container}
          className="map-canvas"
          role="img"
          aria-label={`${mode === "3d" ? "三维" : "二维"}城市指标分布；键盘等价操作位于城市列表`}
        />
        {status === "loading" && (
          <div className="map-overlay" role="status">
            正在加载空间视图…
          </div>
        )}
        {status === "error" && (
          <div className="map-overlay">
            <p>空间视图加载失败，城市列表仍可使用。</p>
            <button
              className="quiet-button"
              onClick={() => {
                setStatus("loading");
                setRetry((n) => n + 1);
              }}
            >
              重试地图
            </button>
          </div>
        )}
        <div className="map-tools">
          <button
            className="quiet-button"
            disabled={!CITY_COORDS[selected] || status !== "ready"}
            onClick={() => focus()}
          >
            聚焦城市
          </button>
          <button
            className="quiet-button"
            disabled={status !== "ready"}
            onClick={() => focus(true)}
          >
            复位
          </button>
        </div>
        <span className="map-compass" aria-hidden="true">
          N<br />↑
        </span>
      </div>
      <div className="map-legend">
        <span>
          <i /> 节点面积表示源数据值
        </span>
        <span>
          <i className="missing-dot" /> 当前指标缺失
        </span>
        <span>
          {mode === "3d"
            ? "拖动调整视角 · 地形高度不代表数值"
            : "选择节点查看城市"}
        </span>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
