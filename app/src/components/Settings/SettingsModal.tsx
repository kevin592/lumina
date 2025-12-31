import { Modal, ModalContent, Button, ScrollShadow } from "@heroui/react";
import { observer } from "mobx-react-lite";
import { RootStore } from "@/store";
import { BaseStore } from "@/store/baseStore";
import { UserStore } from "@/store/user";
import { LuminaStore } from "@/store/luminaStore";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { allSettings } from "@/components/LuminaSettings/settingsConfig";
import { isDesktop } from "@/lib/tauriHelper";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ImportAIDialog } from "@/components/LuminaSettings/ImportAIDialog";

export const SettingsModal = observer(() => {
    const base = RootStore.Get(BaseStore);
    const user = RootStore.Get(UserStore);
    const lumina = RootStore.Get(LuminaStore);
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string>('basic');
    const isMobile = useMediaQuery('(max-width: 768px)');

    const getVisibleSettings = () => {
        let settings = allSettings.filter((setting) => !setting.requireAdmin || user.isSuperAdmin);

        // Hide hotkey settings on mobile platforms
        settings = settings.filter((setting) =>
            (setting.key !== 'hotkey' || isDesktop())
        );

        if (lumina.searchText) {
            const lowerSearchText = lumina.searchText.toLowerCase();
            const filteredSettings = settings.filter((setting) =>
                setting.title.toLowerCase().includes(lowerSearchText) ||
                setting.keywords?.some((keyword) => keyword.toLowerCase().includes(lowerSearchText))
            );
            if (filteredSettings.length === 0) return settings;
            return filteredSettings;
        }

        return settings;
    };

    const getCurrentComponent = () => {
        const setting = allSettings.find((s) => s.key === selected);
        return setting ? <div key={setting.key} className="animate-fade-in">{setting.component}</div> : null;
    };

    return (
        <>
            <ImportAIDialog onSelectTab={setSelected} />
            <Modal
                isOpen={base.isSettingsOpen}
                onOpenChange={(open) => base.toggleSettings(open)}
                size="5xl"
                classNames={{
                    base: "bg-transparent shadow-none",
                    wrapper: "z-[9999]", // Ensure it's on top of everything
                    backdrop: "bg-black/20 backdrop-blur-sm"
                }}
                hideCloseButton
                motionProps={{
                    variants: {
                        enter: {
                            scale: 1,
                            opacity: 1,
                            transition: {
                                duration: 0.3,
                                ease: "easeOut",
                            },
                        },
                        exit: {
                            scale: 0.95,
                            opacity: 0,
                            transition: {
                                duration: 0.2,
                                ease: "easeIn",
                            },
                        },
                    },
                }}
            >
                <ModalContent className="h-[85vh] max-h-[800px] w-full max-w-5xl p-0 overflow-hidden">
                    {(onClose) => (
                        <div className={`flex h-full w-full glass rounded-3xl shadow-float overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>

                            {/* Sidebar */}
                            <div className={`
                flex flex-col bg-gray-50/50 backdrop-blur-md border-r border-white/20
                ${isMobile ? 'w-full h-auto max-h-[30%] border-b border-r-0' : 'w-64 h-full shrink-0'}
              `}>
                                <div className="p-6 pb-4 flex items-center justify-between shrink-0">
                                    <h2 className="text-xl font-bold text-gray-900">{t('settings')}</h2>
                                    {isMobile && <Button isIconOnly size="sm" variant="light" onPress={onClose}><i className="ri-close-line text-xl"></i></Button>}
                                </div>

                                <ScrollShadow className="flex-1 px-4 pb-4">
                                    <nav className="space-y-1">
                                        {getVisibleSettings().map((item) => (
                                            <button
                                                key={item.key}
                                                onClick={() => setSelected(item.key)}
                                                className={`
                          w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200
                          ${selected === item.key
                                                        ? 'bg-white shadow-sm text-brand-primary'
                                                        : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                                                    }
                        `}
                                            >
                                                <i className={`${item.icon} text-lg ${selected === item.key ? 'text-brand-primary' : 'text-gray-400'}`}></i>
                                                <span>{t(item.title)}</span>
                                            </button>
                                        ))}
                                    </nav>
                                </ScrollShadow>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 flex flex-col min-w-0 bg-white/60 relative">
                                {/* Desktop Close Button */}
                                {!isMobile && (
                                    <div className="absolute right-4 top-4 z-10">
                                        <Button
                                            isIconOnly
                                            radius="full"
                                            variant="light"
                                            className="hover:bg-gray-100 text-gray-500"
                                            onPress={onClose}
                                        >
                                            <i className="ri-close-line text-xl"></i>
                                        </Button>
                                    </div>
                                )}

                                <div className="flex-1 overflow-hidden relative">
                                    <ScrollShadow className="h-full">
                                        <div className="p-6 md:p-10 max-w-3xl mx-auto pb-20">
                                            {getCurrentComponent()}
                                        </div>
                                    </ScrollShadow>
                                </div>
                            </div>

                        </div>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
});
