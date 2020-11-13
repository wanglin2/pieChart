<template>
  <div class="chartContainer" ref="container">
    <canvas
      ref="chart"
      @mousemove="onCanvasMousemove"
      @mouseleave="activeIndex"
    ></canvas>
    <div
      class="tooltip"
      v-if="showToolTip && curHoverIndex !== null && tooltipStr"
      :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }"
      v-html="tooltipStr"
    ></div>
  </div>
</template>

<script>
import { move } from "./utils.js";
const colorList = [
  "#9287E7",
  "#FF7B7B",
  "#FEB64D",
  "#49D6A5",
  "#32D3EB",
  "#F4605F",
  "#F49160",
  "#F2D43C",
  "#53CC77",
  "#36E4F7",
  "#58A7F2",
  "#717AF7",
  "#E24F74",
  "#C9EC75",
  "#78F8CB",
  "#9773EE",
  "#636CF8",
  "#FF7B7B",
  "#FEB64D",
  "#49D6A5",
  "#32D3EB",
  "#F2D43C",
  "#FF7CBC",
  "#9287E7",
  "#6DA6FE",
];
const dPI = 2 * Math.PI;
const hPI = Math.PI / 2;

/**
 * @Author: 王林25
 * @Date: 2020-02-17 17:18:40
 * @Desc: 环状图
 */
export default {
  name: "Pie",
  props: {
    // 数据
    data: {
      type: [Array],
      required: true,
      default() {
        return [];
      },
    },

    // 禁止响应鼠标事件
    disableEvent: {
      type: Boolean,
      default: false,
    },

    // 外圆环的半径比例
    outRatio: {
      type: Number,
      default: 0.9,
    },

    // 内圆环的半径比例，设置为0即为饼图
    innerRatio: {
      type: Number,
      default: 0.6,
    },

    // 动画时间，ms
    duration: {
      type: Number,
      default: 1000,
    },

    // 鼠标移到某部分的弹跳动画时间，ms
    bounceDuration: {
      type: Number,
      default: 300,
    },

    // 鼠标移到某部分的弹跳比例，该值会影响到圆环的实际半径，比如设置为0.2，那么半径=1-0.2
    bounceRatio: {
      type: Number,
      default: 0.1,
    },

    // 南丁格尔图
    nightingale: {
      type: Boolean,
      default: false,
    },

    // 是否显示tooltip
    showToolTip: {
      type: Boolean,
      default: true,
    },

    /**
     * @Author: 王林25
     * @Date: 2020-11-12 15:58:20
     * @Desc: 自己实现tooltip
     */
    customToolTip: {
      type: Function,
      default: null,
    },
  },
  data() {
    return {
      ctx: null,
      chart: null,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
      radius: 0,
      radiusInner: 0,
      radiusOut: 0,
      curHoverIndex: null,
      lastHoverIndex: null,
      mousemoveTimer: null,
      cloneData: [],
      showData: [],
      angleData: [],
      inited: false,
      tooltipStr: "",
      tooltipLeft: 0,
      tooltipTop: 0,
    };
  },
  computed: {
    sum() {
      return this.showData && this.showData.length > 0
        ? this.showData.reduce((num, item) => {
            return num + item.num;
          }, 0)
        : 0;
    },
    max() {
      let max = null;
      this.showData.forEach((item) => {
        if (max === null) {
          max = item.num;
        } else {
          if (item.num > max) {
            max = item.num;
          }
        }
      });
      return max;
    },
    hoverRadiusOut() {
      let max = null;
      this.showData.forEach((item) => {
        if (max === null) {
          max = item.hoverDrawRatio;
        } else {
          if (item.hoverDrawRatio > max) {
            max = item.hoverDrawRatio;
          }
        }
      });
      return this.radiusOut + this.radiusOut * max;
    },
  },
  watch: {
    data() {
      this.handleData();
      this.clear();
      this.render();
    },
    innerRatio() {
      this.refresh();
    },
    outRatio() {
      this.refresh();
    },
    bounceRatio() {
      this.refresh();
    },
    nightingale() {
      this.refresh();
    },
  },
  created() {
    this.handleData();
  },
  mounted() {
    this.render();
  },
  methods: {
    /**
     * @Author: 王林25
     * @Date: 2020-11-12 11:13:47
     * @Desc: 数据处理
     */
    handleData(hideIndexList = []) {
      console.log(this.data);
      // 给数据项加上颜色
      this.cloneData = this.data.map((item, index) => {
        return {
          ...item,
          color: item.color || colorList[index % colorList.length],
          hoverDrawRatio: 0,
          stop: null,
        };
      });
      // 过滤掉指定索引的数据
      this.showData = this.cloneData.filter((item, index) => {
        return !hideIndexList.includes(index);
      });
      console.log(this.showData);
    },

    /**
     * @Author: 王林25
     * @Date: 2020-11-10 19:43:11
     * @Desc: 渲染
     */
    render() {
      if (!this.showData || this.showData.length <= 0) {
        return;
      }
      this.$nextTick(() => {
        if (!this.inited) {
          this.inited = true;
          this.init();
        }
        this.angleData = this.getAngleData();
        this.drawChart();
      });
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-17 14:46:30
     * @Desc: 初始化
     */

    init() {
      this.getSizeInfo();
      let canvas = this.$refs.chart;
      canvas.width = this.width;
      canvas.height = this.height;
      this.ctx = canvas.getContext("2d");
      this.ctx.translate(this.centerX, this.centerY);
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-27 10:14:28
     * @Desc: 清除画布
     */
    clear() {
      this.ctx.clearRect(-this.centerX, -this.centerY, this.width, this.height);
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-17 18:37:00
     * @Desc: 绘制圆环
     * arc：在调用该方法时已经有其他的子路径存在，那么arc方法会用一条线段把已有路径的终点与这段圆弧路径的起点连接起来
     * beginPath：清除当前路径中的所有子路径
     */
    drawChart() {
      // 过渡时间不为0
      if (this.duration > 0) {
        // 2秒钟从0度运动到360度
        move(-0.5, 1.5, this.duration, (cur) => {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.arc(
            0,
            0,
            this.hoverRadiusOut,
            -0.5 * Math.PI,
            cur * Math.PI
          );
          this.ctx.closePath();
          this.ctx.clip();
          this.drawPie();
          this.ctx.restore();
        });
      } else {
        // 过渡时间为0
        this.drawPie();
      }
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-18 09:31:37
     * @Desc: 画圆环
     */
    drawPie() {
      this.clear();
      this.ctx.save();
      // 裁剪圆环区域
      this.clipPath();
      // 绘制圆环
      this.renderPie();
      this.ctx.restore();
    },

    /**
     * @Author: 王林25
     * @Date: 2020-11-10 19:40:16
     * @Desc: 裁剪圆环区域
     * 因为clip()方法会将剪切区域设置为当前剪切区域与当前路径的交集，所以对该方法的调用一般都是嵌入save()和restore()方法之间的。否则，剪切区域将会越变越小，这通常不是我们想要的效果，而且否则凸出效果也无法实现，因为之前的剪切区域半径不够
     */
    clipPath() {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.radiusInner, 0, dPI);
      this.ctx.arc(0, 0, this.hoverRadiusOut, 0, dPI, true);
      this.ctx.closePath();
      this.ctx.clip();
    },

    /**
     * @Author: 王林25
     * @Date: 2020-11-10 20:24:16
     * @Desc: 绘制圆环
     */
    renderPie(checkHover, x, y) {
      let hoverIndex = null;
      this.angleData.forEach((item, index) => {
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.fillStyle = this.showData[index].color;
        // 同时减90度，否则起点就不是上面，而是右边了
        let startRadian = item.radian[0] - hPI;
        let endRadian = item.radian[1] - hPI;
        let nightingaleRadius = 0;
        if (this.nightingale) {
          nightingaleRadius =
            (1 - this.showData[index].num / this.max) *
            (this.radiusOut - this.radiusInner);
        }
        let _baseRadiusOut = this.radiusOut - nightingaleRadius;
        let _radiusOut =
          _baseRadiusOut + _baseRadiusOut * this.showData[index].hoverDrawRatio;
        this.ctx.arc(0, 0, _radiusOut, startRadian, endRadian);
        // 路径包含检查
        if (checkHover) {
          if (hoverIndex === null && this.ctx.isPointInPath(x, y)) {
            hoverIndex = index;
          }
        } else {
          this.ctx.fill();
        }
      });
      if (checkHover) {
        return hoverIndex;
      }
    },

    /**
     * @Author: 王林25
     * @Date: 2020-11-11 10:21:04
     * @Desc: 判断是否在内圆环
     */
    checkHoverInInnerCircle(x, y) {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.radiusInner, 0, dPI);
      this.ctx.closePath();
      if (this.ctx.isPointInPath(x, y)) {
        return true;
      }
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-18 11:12:17
     * @Desc: 判断当前鼠标是否在某个圆环上
     */
    getHoverAngleIndex(x, y) {
      this.ctx.save();
      // 移到内圆环不触发
      if (this.checkHoverInInnerCircle(x, y)) {
        return null;
      }
      let index = this.renderPie(true, x, y);
      this.ctx.restore();
      return index;
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-18 11:12:41
     * @Desc: canvas鼠标移动事件
     */
    onCanvasMousemove(e) {
      if (this.disableEvent) {
        return false;
      }
      let rect = this.$refs.chart.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      this.curHoverIndex = this.getHoverAngleIndex(x, y);
      this.onColorBlockMouseleave();
      if (this.curHoverIndex !== null) {
        if (this.lastHoverIndex !== this.curHoverIndex) {
          this.lastHoverIndex = this.curHoverIndex;
          this.onColorBlockMouseenter(this.curHoverIndex);
        }
      } else {
        this.lastHoverIndex = null;
      }
      this.$emit(
        "mousemove",
        e,
        this.curHoverIndex,
        this.curHoverIndex === null ? null : this.showData[this.curHoverIndex]
      );
      this.showTooltip(e);
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-18 10:05:00
     * @Desc: 颜色块鼠标移上事件
     */
    onColorBlockMouseenter(index) {
      if (this.disableEvent) {
        return false;
      }
      move(
        this.showData[index].hoverDrawRatio,
        this.bounceRatio,
        this.bounceDuration,
        (cur) => {
          this.showData[index].hoverDrawRatio = cur;
          this.drawPie();
        },
        null,
        "easeOutBounce"
      );
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-18 10:20:24
     * @Desc:  颜色块鼠标移出事件
     */
    onColorBlockMouseleave() {
      if (this.disableEvent) {
        return false;
      }
      this.showData.forEach((item, index) => {
        if (
          index !== this.curHoverIndex &&
          item.hoverDrawRatio !== 0 &&
          this.showData[index].stop === null
        ) {
          this.showData[index].stop = move(
            item.hoverDrawRatio,
            0,
            this.bounceDuration,
            (cur) => {
              this.showData[index].hoverDrawRatio = cur;
              this.drawPie();
            },
            () => {
              this.showData[index].hoverDrawRatio = 0;
              this.showData[index].stop = null;
            },
            "easeOutBounce"
          );
        }
      });
    },

    /**
     * @Author: 王林25
     * @Date: 2020-11-12 15:43:15
     * @Desc: 显示鼠标跟随提示
     */
    showTooltip(e) {
      if (!this.showToolTip) {
        return;
      }
      if (this.customToolTip) {
        return this.customToolTip(
          e,
          this.curHoverIndex,
          this.curHoverIndex === null ? null : this.showData[this.curHoverIndex]
        );
      }
      if (this.curHoverIndex === null) {
        this.tooltipStr = "";
      } else {
        let data = this.showData[this.curHoverIndex];
        this.tooltipStr = `${data.name}：${data.num}`;
        let { left, top } = this.$refs.container.getBoundingClientRect();
        this.tooltipLeft = e.clientX + 10 - left;
        this.tooltipTop = e.clientY + 10 - top;
      }
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-18 09:31:49
     * @Desc: 计算绘制数据
     */
    getSizeInfo() {
      // 容器宽高
      let { width, height } = this.$refs.container.getBoundingClientRect();
      this.width = width;
      this.height = height;
      // 中心点
      this.centerX = width / 2;
      this.centerY = height / 2;
      // 最大半径
      this.radius = Math.min(width, height) / 2;
      // 内圆环半径
      this.radiusInner = this.radius * Math.min(this.innerRatio, 1);
      // 外圆环半径
      this.radiusOut =
        this.radius * Math.min(this.outRatio, 1 - this.bounceRatio);
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-17 19:10:07
     * @Desc: 获取角度数据
     */
    getAngleData() {
      let arr = [];
      let total = this.sum;
      let curTotalAngle = 0;
      let r = Math.PI / 180;
      this.showData.forEach((item) => {
        let curAngle = (item.num / total) * 360;
        let cruEndAngle = curTotalAngle + curAngle;
        arr.push({
          angle: [curTotalAngle, cruEndAngle],
          radian: [curTotalAngle * r, cruEndAngle * r],
        });
        curTotalAngle += curAngle;
      });
      return arr;
    },

    /**
     * @Author: 王林25
     * @Date: 2020-02-17 15:41:49
     * @Desc: 响应容器尺寸变化
     */
    refresh() {
      this.init();
      this.clear();
      this.drawPie();
    },

    /**
     * @Author: 王林25
     * @Date: 2020-11-12 09:55:13
     * @Desc: 凸出指定索引的圆环
     */
    activeIndex(index) {
      if (
        typeof index !== "number" ||
        index < 0 ||
        index > this.showData.length - 1
      ) {
        this.curHoverIndex = null;
        this.onColorBlockMouseleave();
        return;
      }
      this.curHoverIndex = index;
      this.onColorBlockMouseleave();
      this.onColorBlockMouseenter(index);
    },

    /**
     * @Author: 王林25
     * @Date: 2020-11-12 11:00:14
     * @Desc: 隐藏指定索引的数据
     */
    hideIndex(indexList = []) {
      this.handleData(indexList);
      this.angleData = this.getAngleData();
      this.drawChart();
    },
  },
};
</script>

<style lang="less" scoped>
.chartContainer {
  position: relative;
  width: 100%;
  height: 100%;

  .tooltip {
    position: absolute;
    left: 0;
    top: 0;
    display: block;
    border-style: solid;
    white-space: nowrap;
    z-index: 9999999;
    transition: left 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0s,
      top 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0s;
    background-color: rgba(50, 50, 50, 0.7);
    border-width: 0px;
    border-color: rgb(51, 51, 51);
    border-radius: 4px;
    color: rgb(255, 255, 255);
    font: 14px / 21px "Microsoft YaHei";
    padding: 5px;
    left: 302px;
    top: 454px;
    pointer-events: none;
  }
}
</style>
