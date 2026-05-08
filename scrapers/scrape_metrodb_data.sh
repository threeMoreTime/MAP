#!/usr/bin/env bash
# ============================================================
# MetroDB 城市客流数据爬取脚本
# 数据源: https://metrodb.org/index/{city}.html
# 输出: 各城市文件夹下 {city}_stats.json
# ============================================================

set -euo pipefail

BASE_URL="https://metrodb.org/index"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CITIES_DIR="$ROOT/cities"
LOG_FILE="$SCRIPT_DIR/scrape_metrodb_log.txt"
MAX_PARALLEL=8

# 城市 英文 => 中文 映射
declare -A CITY_CN
CITY_CN=(
    [beijing]=北京 [shanghai]=上海 [guangzhou]=广州 [shenzhen]=深圳
    [chengdu]=成都 [wuhan]=武汉 [chongqing]=重庆 [xian]=西安
    [hangzhou]=杭州 [nanjing]=南京 [tianjin]=天津 [zhengzhou]=郑州
    [changsha]=长沙 [shenyang]=沈阳 [suzhou]=苏州 [nanning]=南宁
    [changchun]=长春 [taiyuan]=太原 [qingdao]=青岛 [dalian]=大连
    [hohhot]=呼和浩特 [changzhou]=常州 [kunming]=昆明 [dongguan]=东莞
    [guiyang]=贵阳 [nanchang]=南昌 [hefei]=合肥 [harbin]=哈尔滨
    [shijiazhuang]=石家庄 [xiamen]=厦门 [lanzhou]=兰州 [wuxi]=无锡
    [wuhu]=芜湖 [foshan]=佛山 [shaoxing]=绍兴 [nantong]=南通
    [fuzhou]=福州 [ningbo]=宁波 [wenzhou]=温州 [jinan]=济南
    [luoyang]=洛阳 [xuzhou]=徐州 [urumqi]=乌鲁木齐 [hongkong]=香港
    [macau]=澳门 [kaohsiung]=高雄 [taichung]=台中 [taipei]=台北
    [jinhua]=金华 [taizhou]=台州 [taoyuan]=桃园
)

init_log() {
    echo "========== MetroDB 爬取日志 $(date '+%Y-%m-%d %H:%M:%S') ==========" > "$LOG_FILE"
}

log() {
    local level="$1" msg="$2"
    echo "[$(date '+%H:%M:%S')] [$level] $msg" | tee -a "$LOG_FILE"
}

# 从 HTML 提取 rollNum 值
# 用法: extract_rollnum "$html" "flow_last"
extract_rollnum() {
    local html="$1" key="$2"
    echo "$html" | grep -oE "rollNum\(\"$key\", [0-9]+, [0-9.]+(, [0-9]+)?\)" \
        | head -1 | grep -oE '[0-9]+\)$' | tr -d ')'
}

# 从 HTML 提取 rollNum 的日期值 (格式 YYYY-MM-DD)
extract_rollnum_date() {
    local html="$1" key="$2"
    echo "$html" | grep -oE "rollNum\(\"$key\", [0-9]+, [0-9]+-[0-9]+-[0-9]+" \
        | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}'
}

# 从 HTML 提取年日均客流数据数组
extract_yearly_data() {
    local html="$1"
    local year_data flow_data

    # 查找包含年份的 data 数组 (紧跟在 yearflowChart 配置中)
    year_data=$(echo "$html" | grep -oE 'data: \[[0-9, .]+\]' \
        | grep -E '201[0-9]|202[0-9]' | head -1 \
        | sed 's/data: \[//;s/\]//' | tr -d ' ')

    flow_data=$(echo "$html" | grep -oE 'data: \[[0-9, .]+\]' \
        | grep -vE '201[0-9]|202[0-9]' | tail -1 \
        | sed 's/data: \[//;s/\]//' | tr -d ' ')

    echo "$year_data|$flow_data"
}

# 爬取单个城市
scrape_city() {
    local city="$1"
    local city_cn="${CITY_CN[$city]:-$city}"
    local city_dir="$CITIES_DIR/$city"

    # 只处理已有文件夹的城市
    [[ ! -d "$city_dir" ]] && return 0

    local html
    html=$(curl -sL --max-time 15 "$BASE_URL/$city.html") || {
        log "FAIL" "$city ($city_cn) 页面请求失败"
        return 1
    }

    # 检查是否有实际数据（缺数据的城市没有 rollNum）
    local has_data
    has_data=$(echo "$html" | grep -c "rollNum" || true)
    if [[ "$has_data" -eq 0 ]]; then
        log "SKIP" "$city ($city_cn) 无客流数据"
        return 0
    fi

    # 提取各项数据
    local line_open line_build total_milage flow_top flow_top_date flow_last flow_ratio open_site
    line_open=$(extract_rollnum "$html" "line_open")
    line_build=$(extract_rollnum "$html" "line_build")
    total_milage=$(extract_rollnum "$html" "total_milage")
    flow_top=$(extract_rollnum "$html" "flow_top")
    flow_top_date=$(extract_rollnum_date "$html" "flow_top_date")
    flow_last=$(extract_rollnum "$html" "flow_last")
    flow_ratio=$(extract_rollnum "$html" "flow_ratio")
    open_site=$(extract_rollnum "$html" "open_site")

    # 提取年度数据
    local yearly_raw years_arr values_arr
    yearly_raw=$(extract_yearly_data "$html")
    years_arr="${yearly_raw%%|*}"
    values_arr="${yearly_raw##*|}"

    # 构建 years/values JSON 数组
    local years_json values_json
    years_json="[]"
    values_json="[]"

    if [[ -n "$years_arr" && "$years_arr" != "|"* && "$years_arr" != *"|" ]]; then
        years_json=$(echo "$years_arr" | awk -F', ' '{
            printf "["
            for(i=1;i<=NF;i++) {
                printf "%s%s", (i>1?", ":""), $i
            }
            printf "]"
        }')
    fi

    if [[ -n "$values_arr" && "$values_arr" != "|" ]]; then
        values_json=$(echo "$values_arr" | awk -F', ' '{
            printf "["
            for(i=1;i<=NF;i++) {
                printf "%s%s", (i>1?", ":""), $i
            }
            printf "]"
        }')
    fi

    # 生成 JSON
    local json_file="$city_dir/${city}_stats.json"
    cat > "$json_file" << JSONEOF
{
  "city": "$city",
  "city_cn": "$city_cn",
  "scrape_date": "$(date '+%Y-%m-%d')",
  "operating_lines": ${line_open:-0},
  "lines_under_construction": ${line_build:-0},
  "operating_stations": ${open_site:-0},
  "operating_mileage_km": ${total_milage:-0},
  "daily_ridership_wan": ${flow_last:-0},
  "ridership_intensity": ${flow_ratio:-0},
  "peak_ridership_wan": ${flow_top:-0},
  "peak_ridership_date": "${flow_top_date:-unknown}",
  "yearly_avg_ridership": {
    "years": $years_json,
    "values": $values_json
  }
}
JSONEOF

    log "  OK" "$city ($city_cn) 日客流 ${flow_last:-?}万, 里程 ${total_milage:-?}km"
}

export -f scrape_city extract_rollnum extract_rollnum_date extract_yearly_data log
export SCRIPT_DIR CITIES_DIR BASE_URL
declare -px CITY_CN

main() {
    echo "============================================"
    echo " MetroDB 客流数据爬取工具"
    echo " 并发: $MAX_PARALLEL"
    echo " 输出: cities/{city}/{city}_stats.json"
    echo "============================================"
    echo ""

    init_log

    # 获取已有城市文件夹
    local cities=()
    for dir in "$CITIES_DIR"/*/; do
        [[ -d "$dir" ]] && cities+=("$(basename "$dir")")
    done

    echo "发现 ${#cities[@]} 个城市文件夹"
    echo ""

    # 并发爬取
    printf '%s\n' "${cities[@]}" | xargs -I{} -P "$MAX_PARALLEL" bash -c 'scrape_city "$1"' _ {}

    # 统计
    local json_count
    json_count=$(find "$CITIES_DIR" -name "*_stats.json" -type f 2>/dev/null | wc -l)
    echo ""
    echo "============================================"
    echo " 完成: 生成 $json_count 个 JSON 文件"
    echo " 日志: $LOG_FILE"
    echo "============================================"
}

main
