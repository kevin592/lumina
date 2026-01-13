import { observer } from "mobx-react-lite";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Image } from "@heroui/react";
import { useState } from "react";

// 默认头像列表
const DEFAULT_AVATARS = [
  'generated_avatars/Aneka.png',
  'generated_avatars/Bandit.png',
  'generated_avatars/Coco.png',
  'generated_avatars/Felix.png',
  'generated_avatars/Gizmo.png',
  'generated_avatars/Jasper.png',
  'generated_avatars/Leo.png',
  'generated_avatars/Lola.png',
  'generated_avatars/Luna.png',
  'generated_avatars/Midnight.png',
  'generated_avatars/Milo.png',
  'generated_avatars/Oliver.png',
  'generated_avatars/Pepper.png',
  'generated_avatars/Rocky.png',
  'generated_avatars/Sasha.png',
  'generated_avatars/Zoe.png',
];

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarPath: string) => void;
  currentAvatar?: string;
}

export const AvatarSelector = observer(({ isOpen, onClose, onSelect, currentAvatar }: AvatarSelectorProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '');

  const handleSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
  };

  const handleConfirm = () => {
    if (selectedAvatar) {
      onSelect(`/avatars/${selectedAvatar}`);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>选择头像</ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-4 gap-4">
            {DEFAULT_AVATARS.map((avatar) => {
              const avatarPath = `/avatars/${avatar}`;
              const isSelected = selectedAvatar === avatarPath || (!selectedAvatar && currentAvatar === avatarPath);

              return (
                <div
                  key={avatar}
                  className={`
                    cursor-pointer rounded-lg p-2 transition-all
                    ${isSelected ? 'bg-primary-100 ring-2 ring-primary' : 'hover:bg-default-100'}
                  `}
                  onClick={() => handleSelect(avatarPath)}
                >
                  <Image
                    src={avatarPath}
                    alt={avatar}
                    className="w-full h-auto"
                    removeWrapper
                  />
                  <div className="text-center text-xs mt-2 text-foreground-600">
                    {avatar.replace('generated_avatars/', '').replace('.png', '')}
                  </div>
                </div>
              );
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            取消
          </Button>
          <Button
            color="primary"
            onPress={handleConfirm}
            isDisabled={!selectedAvatar && !currentAvatar}
          >
            确认
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});
