import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { RootStore } from "@/store";
import { OKRStore, TaskType, TaskPriority, Task } from "@/store/module/OKRStore";
import { DialogStore } from "@/store/module/Dialog";
import { Button, Input, Textarea, Select, SelectItem } from "@heroui/react";
import dayjs from 'dayjs';

interface EditTaskDialogProps {
  task: Task;
  onSuccess?: () => void;
}

const EditTaskDialog = observer(({ task, onSuccess }: EditTaskDialogProps) => {
  const okrStore = RootStore.Get(OKRStore);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [taskType, setTaskType] = useState<TaskType>(task.taskType);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDateStr, setDueDateStr] = useState(task.dueDate ? dayjs(task.dueDate).format('YYYY-MM-DD') : '');
  const [estimatedHours, setEstimatedHours] = useState<string>(task.estimatedHours?.toString() || '');
  const [objectiveId, setObjectiveId] = useState<number | null>(task.objectiveId);
  const [keyResultId, setKeyResultId] = useState<number | null>(task.keyResultId);
  const [isLoading, setIsLoading] = useState(false);

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
      alert('标题不能为空');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await okrStore.updateTask.call({
        id: task.id,
        title,
        description: description || null,
        taskType,
        priority,
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
      DAILY: '日常',
      CREATIVE: '创意',
      SUBTASK: '子任务',
      FLASH: '闪念',
    };
    return textMap[type];
  };

  const getPriorityText = (priority: TaskPriority) => {
    const textMap: Record<TaskPriority, string> = {
      LOW: '低',
      MEDIUM: '中',
      HIGH: '高',
      URGENT: '紧急',
    };
    return textMap[priority];
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="标题"
        labelPlacement="outside"
        placeholder="输入任务标题"
        variant="bordered"
        value={title}
        onValueChange={setTitle}
        isRequired
      />

      <Textarea
        label="描述"
        labelPlacement="outside"
        placeholder="输入任务描述（可选）"
        variant="bordered"
        value={description}
        onValueChange={setDescription}
        minRows={2}
      />

      <div className="flex gap-4">
        <Select
          label="任务类型"
          labelPlacement="outside"
          placeholder="选择任务类型"
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

        <Select
          label="优先级"
          labelPlacement="outside"
          placeholder="选择优先级"
          variant="bordered"
          selectedKeys={[priority]}
          onSelectionChange={keys => setPriority(Array.from(keys)[0] as TaskPriority)}
          className="flex-1"
        >
          <SelectItem key="LOW">{getPriorityText('LOW')}</SelectItem>
          <SelectItem key="MEDIUM">{getPriorityText('MEDIUM')}</SelectItem>
          <SelectItem key="HIGH">{getPriorityText('HIGH')}</SelectItem>
          <SelectItem key="URGENT">{getPriorityText('URGENT')}</SelectItem>
        </Select>
      </div>

      <div className="flex gap-4">
        <Input
          label="截止日期（可选）"
          labelPlacement="outside"
          type="date"
          variant="bordered"
          value={dueDateStr}
          onValueChange={setDueDateStr}
          className="flex-1"
        />

        <Input
          type="number"
          label="预估工时（可选）"
          labelPlacement="outside"
          placeholder="例如：2"
          variant="bordered"
          value={estimatedHours}
          onValueChange={setEstimatedHours}
          min="0"
          step="0.5"
          className="flex-1"
        />
      </div>

      <Select
        label="关联 OKR（可选）"
        labelPlacement="outside"
        placeholder="选择关联的 OKR"
        variant="bordered"
        selectedKeys={objectiveId ? [objectiveId] : []}
        onSelectionChange={keys => {
          const id = Array.from(keys)[0] as number | undefined;
          setObjectiveId(id || null);
          setKeyResultId(null); // Reset KR when objective changes
        }}
      >
        {okrStore.objectives.value?.filter(o => o.status === 'PENDING').map((objective) => (
          <SelectItem key={objective.id}>{objective.title}</SelectItem>
        ))}
      </Select>

      {objectiveId && availableKeyResults.length > 0 && (
        <Select
          label="关联关键结果（可选）"
          labelPlacement="outside"
          placeholder="选择关联的关键结果"
          variant="bordered"
          selectedKeys={keyResultId ? [keyResultId] : []}
          onSelectionChange={keys => {
            const id = Array.from(keys)[0] as number | undefined;
            setKeyResultId(id || null);
          }}
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
          保存
        </Button>
      </div>
    </div>
  );
});

export default EditTaskDialog;
