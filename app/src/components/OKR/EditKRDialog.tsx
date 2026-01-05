import { useState } from "react";
import { observer } from "mobx-react-lite";
import { RootStore } from "@/store";
import { OKRStore, KeyResult } from "@/store/module/OKRStore";
import { DialogStore } from "@/store/module/Dialog";
import { Button, Input, Textarea } from "@heroui/react";

interface EditKRDialogProps {
  keyResult: KeyResult;
  onSuccess?: () => void;
}

const EditKRDialog = observer(({ keyResult, onSuccess }: EditKRDialogProps) => {
  const okrStore = RootStore.Get(OKRStore);
  const [title, setTitle] = useState(keyResult.title);
  const [description, setDescription] = useState(keyResult.description || '');
  const [targetValue, setTargetValue] = useState<string>(String(keyResult.targetValue || ''));
  const [unit, setUnit] = useState(keyResult.unit || '');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!title.trim()) {
      alert('标题不能为空');
      return false;
    }
    const target = parseFloat(targetValue);
    if (!targetValue || isNaN(target) || target <= 0) {
      alert('请输入有效的目标值');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await okrStore.updateKeyResult.call({
        id: keyResult.id,
        title,
        description: description || null,
        targetValue: parseFloat(targetValue),
        unit: unit || null
      });

      RootStore.Get(DialogStore).close();
      onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="标题"
        labelPlacement="outside"
        placeholder="输入关键结果标题"
        variant="bordered"
        value={title}
        onValueChange={setTitle}
        isRequired
      />

      <Textarea
        label="描述"
        labelPlacement="outside"
        placeholder="输入关键结果描述（可选）"
        variant="bordered"
        value={description}
        onValueChange={setDescription}
        minRows={2}
      />

      <div className="flex gap-4">
        <Input
          type="number"
          label="目标值"
          labelPlacement="outside"
          placeholder="例如：100"
          variant="bordered"
          value={targetValue}
          onValueChange={setTargetValue}
          isRequired
          className="flex-1"
        />

        <Input
          label="单位"
          labelPlacement="outside"
          placeholder="例如：个、%、小时"
          variant="bordered"
          value={unit}
          onValueChange={setUnit}
          className="flex-1"
        />
      </div>

      <div className="flex w-full gap-2 mt-4">
        <Button
          color="primary"
          className="flex-1"
          isLoading={isLoading}
          onPress={handleSubmit}
        >
          保存
        </Button>
      </div>
    </div>
  );
});

export default EditKRDialog;
