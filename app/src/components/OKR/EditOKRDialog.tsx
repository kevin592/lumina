import { useState } from "react";
import { observer } from "mobx-react-lite";
import { RootStore } from "@/store";
import { OKRStore, OKRPeriod, Objective } from "@/store/module/OKRStore";
import { DialogStore } from "@/store/module/Dialog";
import { Button, Input, Textarea, Select, SelectItem } from "@heroui/react";
import dayjs from 'dayjs';
import { useTranslation } from "react-i18next";

interface EditOKRDialogProps {
  objective: Objective;
  onSuccess?: () => void;
}

const EditOKRDialog = observer(({ objective, onSuccess }: EditOKRDialogProps) => {
  const { t } = useTranslation();
  const okrStore = RootStore.Get(OKRStore);
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description || '');
  const [period, setPeriod] = useState<OKRPeriod>(objective.period);
  const [startDateStr, setStartDateStr] = useState(dayjs(objective.startDate).format('YYYY-MM-DD'));
  const [endDateStr, setEndDateStr] = useState(objective.endDate ? dayjs(objective.endDate).format('YYYY-MM-DD') : '');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!title.trim()) {
      alert(t('okr.validation.title-required'));
      return false;
    }
    if (!startDateStr) {
      alert(t('okr.validation.start-date-required'));
      return false;
    }
    if (endDateStr && startDateStr >= endDateStr) {
      alert(t('okr.validation.end-date-invalid'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await okrStore.updateObjective.call({
        id: objective.id,
        title,
        description: description || null,
        period,
        startDate: startDateStr,
        endDate: endDateStr || undefined
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
        placeholder="输入 OKR 标题"
        variant="bordered"
        value={title}
        onValueChange={setTitle}
        isRequired
      />

      <Textarea
        label="描述"
        labelPlacement="outside"
        placeholder="输入 OKR 描述（可选）"
        variant="bordered"
        value={description}
        onValueChange={setDescription}
        minRows={3}
      />

      <Select
        label="周期"
        labelPlacement="outside"
        placeholder="选择周期"
        variant="bordered"
        selectedKeys={[period]}
        onSelectionChange={keys => setPeriod(Array.from(keys)[0] as OKRPeriod)}
      >
        <SelectItem key="WEEKLY">周度</SelectItem>
        <SelectItem key="MONTHLY">月度</SelectItem>
        <SelectItem key="QUARTERLY">季度</SelectItem>
        <SelectItem key="YEARLY">年度</SelectItem>
        <SelectItem key="CUSTOM">自定义</SelectItem>
      </Select>

      <Input
        label="开始日期"
        labelPlacement="outside"
        type="date"
        variant="bordered"
        value={startDateStr}
        onValueChange={setStartDateStr}
        isRequired
      />

      <Input
        label="结束日期（可选）"
        labelPlacement="outside"
        type="date"
        variant="bordered"
        value={endDateStr}
        onValueChange={setEndDateStr}
      />

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

export default EditOKRDialog;
