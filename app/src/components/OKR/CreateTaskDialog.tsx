import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { RootStore } from "@/store";
import { OKRStore, TaskType, TaskPriority, TaskStatus } from "@/store/module/OKRStore";
import { DialogStore } from "@/store/module/Dialog";
import { Button, Input, Textarea, Select, SelectItem } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface CreateTaskDialogProps {
  onSuccess?: () => void;
  defaultObjectiveId?: number | null;
  defaultKeyResultId?: number | null;
}

const CreateTaskDialog = observer(({ onSuccess, defaultObjectiveId, defaultKeyResultId }: CreateTaskDialogProps) => {
  const { t } = useTranslation();
  const okrStore = RootStore.Get(OKRStore);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('DAILY');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDateStr, setDueDateStr] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [objectiveId, setObjectiveId] = useState<number | null>(defaultObjectiveId ?? null);
  const [keyResultId, setKeyResultId] = useState<number | null>(defaultKeyResultId ?? null);
  const [isLoading, setIsLoading] = useState(false);

  // 当默认值变化时，更新状态
  useEffect(() => {
    if (defaultObjectiveId !== undefined) {
      setObjectiveId(defaultObjectiveId);
    }
    if (defaultKeyResultId !== undefined) {
      setKeyResultId(defaultKeyResultId);
    }
  }, [defaultObjectiveId, defaultKeyResultId]);

  // Load active objectives for selection
  useEffect(() => {
    okrStore.loadObjectives({
      page: 1,
      size: 100,
      status: 'PENDING'
    });
  }, []);

  // Get available key results based on selected objective
  const selectedObjective = okrStore.objectives.value?.find(o => o.id === objectiveId);
  const availableKeyResults = selectedObjective?.keyResults || [];

  const validateForm = () => {
    if (!title.trim()) {
      alert(t('okr.validation.title-required'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await okrStore.createTask.call({
        title,
        description: description || null,
        taskType,
        priority,
        status: 'PENDING',
        dueDate: dueDateStr || null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        objectiveId,
        keyResultId: keyResultId || null
      });

      RootStore.Get(DialogStore).close();
      onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskTypeText = (type: TaskType) => {
    const textMap: Record<TaskType, string> = {
      DAILY: t('daily') || '日常',
      CREATIVE: t('creative') || '创意',
      SUBTASK: t('subtask') || '子任务',
      FLASH: t('flash') || '闪念',
    };
    return textMap[type];
  };

  const getPriorityText = (priority: TaskPriority) => {
    const textMap: Record<TaskPriority, string> = {
      LOW: t('low') || '低',
      MEDIUM: t('medium') || '中',
      HIGH: t('high') || '高',
      URGENT: t('urgent') || '紧急',
    };
    return textMap[priority];
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={t('title') || '标题'}
        labelPlacement="outside"
        placeholder={t('enter-task-title') || '输入任务标题'}
        variant="bordered"
        value={title}
        onValueChange={setTitle}
        isRequired
      />

      <Textarea
        label={t('description') || '描述'}
        labelPlacement="outside"
        placeholder={t('enter-task-description') || '输入任务描述（可选）'}
        variant="bordered"
        value={description}
        onValueChange={setDescription}
        minRows={2}
      />

      <div className="flex gap-4">
        {/* 只有日常任务才显示任务类型选择 */}
        {!objectiveId && (
          <Select
            label={t('task-type') || '任务类型'}
            labelPlacement="outside"
            placeholder={t('select-task-type') || '选择任务类型'}
            variant="bordered"
            selectedKeys={[taskType]}
            onSelectionChange={keys => setTaskType(Array.from(keys)[0] as TaskType)}
            className="flex-1"
          >
            <SelectItem key="DAILY">{getTaskTypeText('DAILY')}</SelectItem>
            <SelectItem key="CREATIVE">{getTaskTypeText('CREATIVE')}</SelectItem>
            <SelectItem key="SUBTASK">{getTaskTypeText('SUBTASK')}</SelectItem>
            <SelectItem key="FLASH">{getTaskTypeText('FLASH')}</SelectItem>
          </Select>
        )}

        <Select
          label={t('priority') || '优先级'}
          labelPlacement="outside"
          placeholder={t('select-priority') || '选择优先级'}
          variant="bordered"
          selectedKeys={[priority]}
          onSelectionChange={keys => setPriority(Array.from(keys)[0] as TaskPriority)}
          className={!objectiveId ? 'flex-1' : 'w-full'}
        >
          <SelectItem key="LOW">{getPriorityText('LOW')}</SelectItem>
          <SelectItem key="MEDIUM">{getPriorityText('MEDIUM')}</SelectItem>
          <SelectItem key="HIGH">{getPriorityText('HIGH')}</SelectItem>
          <SelectItem key="URGENT">{getPriorityText('URGENT')}</SelectItem>
        </Select>
      </div>

      <div className="flex gap-4">
        <Input
          label={t('due-date') || '截止日期（可选）'}
          labelPlacement="outside"
          type="date"
          variant="bordered"
          value={dueDateStr}
          onValueChange={setDueDateStr}
          className="flex-1"
        />

        <Input
          type="number"
          label={t('estimated-hours') || '预估工时（可选）'}
          labelPlacement="outside"
          placeholder={t('estimated-hours-placeholder') || '例如：2'}
          variant="bordered"
          value={estimatedHours}
          onValueChange={setEstimatedHours}
          min="0"
          step="0.5"
          className="flex-1"
        />
      </div>

      <Select
        label={t('link-to-okr') || '关联 OKR（可选）'}
        labelPlacement="outside"
        placeholder={t('select-okr') || '选择关联的 OKR'}
        variant="bordered"
        selectedKeys={objectiveId ? [objectiveId] : []}
        onSelectionChange={keys => {
          const id = Array.from(keys)[0] as number | undefined;
          setObjectiveId(id || null);
          setKeyResultId(null); // Reset KR when objective changes
        }}
        isDisabled={defaultObjectiveId !== undefined}
      >
        {okrStore.objectives.value?.filter(o => o.status === 'PENDING').map((objective) => (
          <SelectItem key={objective.id}>{objective.title}</SelectItem>
        ))}
      </Select>

      {objectiveId && availableKeyResults.length > 0 && (
        <Select
          label={t('link-to-kr') || '关联关键结果（可选）'}
          labelPlacement="outside"
          placeholder={t('select-kr') || '选择关联的关键结果'}
          variant="bordered"
          selectedKeys={keyResultId ? [keyResultId] : []}
          onSelectionChange={keys => {
            const id = Array.from(keys)[0] as number | undefined;
            setKeyResultId(id || null);
          }}
          isDisabled={defaultKeyResultId !== undefined}
        >
          {availableKeyResults.map((kr) => (
            <SelectItem key={kr.id}>{kr.title}</SelectItem>
          ))}
        </Select>
      )}

      <div className="flex w-full gap-2 mt-4">
        <Button
          color="primary"
          className="flex-1"
          isLoading={isLoading}
          onPress={handleSubmit}
        >
          {t('create') || '创建'}
        </Button>
      </div>
    </div>
  );
});

export default CreateTaskDialog;
