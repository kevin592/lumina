import { observer } from 'mobx-react-lite';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea, Select, SelectItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { OKRPeriod } from '@/store/module/OKRStore';
import { RootStore } from '@/store';
import { OKRStore } from '@/store/module/OKRStore';

interface CreateObjectiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 创建OKR对话框
 */
const CreateObjectiveDialog = observer(({ isOpen, onClose, onSuccess }: CreateObjectiveDialogProps) => {
  const { t } = useTranslation();
  const okrStore = RootStore.Get(OKRStore);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState<OKRPeriod>('QUARTERLY');

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      await okrStore.createObjective.call({
        title: title.trim(),
        description: description.trim() || undefined,
        period,
        startDate: new Date().toISOString(),
      });

      setTitle('');
      setDescription('');
      setPeriod('QUARTERLY');

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to create objective:', error);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPeriod('QUARTERLY');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalContent>
        <ModalHeader>
          {t('create-okr') || '创建OKR'}
        </ModalHeader>

        <ModalBody className="space-y-4">
          <Input
            label={t('title') || '标题'}
            placeholder={t('enter-objective-title') || '输入目标标题'}
            value={title}
            onValueChange={setTitle}
            isRequired
            variant="bordered"
          />

          <Textarea
            label={t('description') || '描述'}
            placeholder={t('enter-objective-description') || '输入目标描述（可选）'}
            value={description}
            onValueChange={setDescription}
            variant="bordered"
            minRows={3}
          />

          <Select
            label={t('period') || '周期'}
            placeholder={t('select-period') || '选择周期'}
            selectedKeys={[period]}
            onSelectionChange={(keys) => setPeriod(Array.from(keys)[0] as OKRPeriod)}
            variant="bordered"
          >
            <SelectItem key="WEEKLY">{t('weekly') || '周'}</SelectItem>
            <SelectItem key="MONTHLY">{t('monthly') || '月'}</SelectItem>
            <SelectItem key="QUARTERLY">{t('quarterly') || '季度'}</SelectItem>
            <SelectItem key="YEARLY">{t('yearly') || '年'}</SelectItem>
            <SelectItem key="CUSTOM">{t('custom') || '自定义'}</SelectItem>
          </Select>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            {t('cancel') || '取消'}
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isDisabled={!title.trim()}
            isLoading={okrStore.createObjective.loading.value}
          >
            {t('create') || '创建'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});

export default CreateObjectiveDialog;
