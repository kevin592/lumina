import { observer } from "mobx-react-lite";

import { Input } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { RootStore } from "@/store";
import { ToastPlugin } from "@/store/module/Toast/Toast";

export const PasswordInput = observer(({
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  className
}: {
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void,
  label?: string,
  placeholder?: string,
  className?: string
}) => {
  const { t } = useTranslation()
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible)

  // 防止复制密码
  const handleCopy = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    RootStore.Get(ToastPlugin).warn(t('password-cannot-be-copied') || '出于安全考虑，密码无法复制');
  };

  return <Input
    className={className}
    isRequired
    endContent={
      <button type="button" onClick={toggleConfirmVisibility}>
        {isConfirmVisible ? (
          <i className="ri-eye-off-line pointer-events-none text-2xl text-default-400"></i>
        ) : (
          <i className="ri-eye-line pointer-events-none text-2xl text-default-400"></i>
        )}
      </button>
    }
    label={label}
    labelPlacement="outside"
    name="confirmPassword"
    placeholder={placeholder}
    type={isConfirmVisible ? "text" : "password"}
    variant="bordered"
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    onCopy={handleCopy}
    onCut={handleCopy}
  />
})