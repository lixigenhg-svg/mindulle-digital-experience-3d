/** 摇杆输入（手机/触屏用）：up = 前进，right = 右移，范围 -1~1 */
export const stick = { up: 0, right: 0, active: false };

export function resetStick() {
  stick.up = 0;
  stick.right = 0;
  stick.active = false;
}
