import copy from "copy-to-clipboard";
import { useState } from "react";
type IProps = { content: string, size: number, className?: string }

export const Copy = ({ content, size = 20, className }: IProps) => {
  const [isCopy, setCopy] = useState(false)
  return <div className={className}>
    {
      !isCopy ? <i className="ri-file-copy-line text-desc cursor-pointer" style={{fontSize: size + 'px'}} onClick={(e) => {
        e.stopPropagation()
        copy(content)
        setCopy(true)
        setTimeout(() => { setCopy(false) }, 1000)
      }} />
        : <i className="ri-checkbox-circle-fill text-green-500" style={{fontSize: size + 'px'}} />
    }
  </div>
}