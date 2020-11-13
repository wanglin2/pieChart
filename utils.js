const ease = {
  // 弹跳
  easeOutBounce(t, b, c, d) {
    if ((t /= d) < (1 / 2.75)) {
      return c * (7.5625 * t * t) + b;
    } else if (t < (2 / 2.75)) {
      return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
    } else if (t < (2.5 / 2.75)) {
      return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
    } else {
      return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
    }
  },
  // 慢进慢出
  easeInOut(t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t + b
    return c / 2 * ((t -= 2) * t * t + 2) + b
  }
}
/**
 * javascript comment
 * @Author: 王林25
 * @Date: 2020-02-17 20:21:15
 * @Desc: 动画函数
 */
export function move(from, to, dur = 500, callback = () => {}, done = () => {}, easing = 'easeInOut') {
  let spaceNum = to - from
  let startTime = Date.now()
  let isStop = false
  let timer = null
  let run = () => {
    if (isStop) {
      return false
    }
    let curTime = Date.now()
    let spaceTime = curTime - startTime
    let ratio = ease[easing](spaceTime, 0, 1, dur)
    ratio = ratio > 1 ? 1 : ratio
    let step = spaceNum * ratio + from
    callback && callback(step)
    if (ratio < 1) {
      timer = window.requestAnimationFrame(run)
    } else {
      done && done()
    }
  }
  run()
  return () => {
    isStop = true
    cancelAnimationFrame(timer)
  }
}