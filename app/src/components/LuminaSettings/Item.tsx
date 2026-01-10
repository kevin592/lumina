import { Button, DropdownTrigger, DropdownItem, DropdownMenu, Dropdown, Tooltip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { observer } from "mobx-react-lite";
import { ReactNode } from "react";

// New Container Component for grouped settings
export const SettingCard = ({ children, className = "" }: { children: ReactNode, className?: string }) => {
  return (
    <div className={`bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm overflow-hidden ${className}`}>
      <div className="flex flex-col divide-y divide-gray-200/50">
        {children}
      </div>
    </div>
  );
};

export const SettingSectionTitle = ({ title, subtitle }: { title: string, subtitle?: string }) => {
  return (
    <div className="mb-4 px-1">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

type IProps = {
  // New structured props
  title?: ReactNode;
  description?: ReactNode;

  // Legacy/Flexible props
  leftContent?: ReactNode;
  rightContent?: ReactNode;

  type?: 'row' | 'col';
  hidden?: boolean;
  className?: string;
  isLast?: boolean; // To manually control separator if needed (though divide-y handles most)
}


export const Item = observer(({
  title,
  description,
  leftContent,
  rightContent,
  type = 'row',
  hidden = false,
  className = ""
}: IProps) => {
  if (hidden) return null

  if (type == 'col') {
    return (
      <div className={`flex flex-col py-4 px-6 ${className}`}>
        <div className="mb-3">
          {(title || leftContent) && (
            <label className="text-sm font-medium text-gray-900 block">
              {title || leftContent}
            </label>
          )}
          {description && <p className="text-xs text-default-500 mt-1">{description}</p>}
        </div>
        <div className="w-full">{rightContent}</div>
      </div>
    )
  } else {
    // Fortent V6.5 - Refined Row Style
    return (
      <div className={`flex flex-row items-center justify-between py-4 px-6 min-h-[3.5rem] ${className}`}>
        <div className="flex flex-col gap-0.5 shrink-0 mr-4">
          {(title || leftContent) && (
            <div className={rightContent ? "text-sm font-medium text-gray-900" : 'w-full'}>
              {title || leftContent}
            </div>
          )}
          {description && <div className="text-xs text-default-500">{description}</div>}
        </div>

        {!!rightContent && <div className="ml-auto shrink-0 flex items-center">{rightContent}</div>}
      </div>
    )
  }
})


export const ItemWithTooltip = observer(({ content, toolTipContent }: { content: any, toolTipContent: any }) => {
  return <Tooltip content={<div className="max-w-[300px] flex flex-col gap-2 p-2">
    {toolTipContent}
  </div>}>
    <div className="flex items-center gap-2">
      {content}
      <i className="ri-information-line text-lg text-default-400"></i>
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
          className="min-w-[120px] justify-between"
        >
          {t(value as string) || placeholder}
          <i className="ri-arrow-down-s-line ml-2 text-gray-400"></i>
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