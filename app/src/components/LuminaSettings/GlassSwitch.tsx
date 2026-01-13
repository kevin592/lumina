import { Switch, SwitchProps } from "@heroui/react";
import { glassSwitchStyles } from "./glassStyles";

/**
 * GlassSwitch - 玻璃态开关组件
 *
 * 使用紫色主题（#8B5CF6）作为激活状态
 * 用于设置界面的开关控件
 *
 * @example
 * ```tsx
 * <GlassSwitch isSelected={enabled} onValueChange={setEnabled}>
 *   启用功能
 * </GlassSwitch>
 * ```
 */
export const GlassSwitch = (props: SwitchProps) => {
  return (
    <Switch
      classNames={glassSwitchStyles}
      {...props}
    />
  );
};

export default GlassSwitch;
