import { Button, DropdownTrigger, DropdownItem, DropdownMenu, Dropdown, Tooltip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { observer } from "mobx-react-lite";

type IProps = {
  leftContent?: any
  rightContent?: any
  type?: 'row' | 'col'
  hidden?: boolean
  className?: string
}


export const Item = observer(({ leftContent, rightContent, type = 'row', hidden = false, className }: IProps) => {
  if (hidden) return null
  if (type == 'col') {
    return <div className={`flex flex-col py-3 ${className}`}>
      <label className="text-sm font-bold text-gray-700 mb-2">{leftContent}</label>
      <div className="w-full">{rightContent}</div>
    </div>
  } else {
    // Design v2.0 - 表单项样式优化
    return <div className={`flex flex-row items-center py-3 ${className}`}>
      {!!leftContent && <div className={rightContent ? "text-sm font-bold text-gray-700" : 'w-full'}>{leftContent}</div>}
      {!!rightContent && <div className="ml-auto">{rightContent}</div>}
    </div>
  }
})


export const ItemWithTooltip = observer(({ content, toolTipContent }: { content: any, toolTipContent: any }) => {
  return  <Tooltip content={<div className="max-w-[300px] flex flex-col gap-2 p-2">
      {toolTipContent}
    </div>}>
      <div className="flex items-center gap-2">
        {content}
        <i className="ri-information-line text-lg"></i>
      </div>
    </Tooltip>
})


interface SelectDropdownProps {
  value?: string
  placeholder?: string
  icon?: string
  options: Array<{
    key: string
    label: string
  }>
  onChange: (value: string) => void | Promise<void>
}
export const SelectDropdown = ({
  value,
  placeholder,
  icon,
  options,
  onChange
}: SelectDropdownProps) => {
  const { t } = useTranslation()
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant='flat'
          startContent={icon && <i className={icon}></i>}
        >
          {t(value as string) || placeholder}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Selection"
        onAction={async (key) => {
          await onChange(key.toString())
        }}
        selectedKeys={[value || '']}
      >
        {options.map(option => (
          <DropdownItem key={option.key}>{option.label}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}