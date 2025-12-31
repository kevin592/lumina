import { Popover, PopoverContent, PopoverTrigger, Select, SelectItem, Button, Radio, RadioGroup } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { useState } from "react";
import { RangeCalendar } from "@heroui/react";
import { today, getLocalTimeZone } from "@internationalized/date";
import dayjs from "@/lib/dayjs";
import TagSelector from "@/components/Common/TagSelector";

export default function FilterPop() {
  const { t } = useTranslation();
  const lumina = RootStore.Get(LuminaStore);

  const [dateRange, setDateRange] = useState<{
    start: any;
    end: any;
  }>({
    start: null,
    end: null
  });
  const [focusedValue, setFocusedValue] = useState(today(getLocalTimeZone()));
  const [tagStatus, setTagStatus] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

  const conditions = [
    { label: t('has-link'), value: 'hasLink' },
    { label: t('has-file'), value: 'hasFile' },
    { label: t('public'), value: 'isShare' },
    { label: t('has-todo'), value: 'hasTodo' },
  ];

  const handleApplyFilter = () => {
    lumina.noteListFilterConfig = {
      ...lumina.noteListFilterConfig,
      startDate: dateRange.start ? new Date(dateRange.start.toString()) : null,
      endDate: dateRange.end ? new Date(dateRange.end.toString()) : null,
      tagId: selectedTag ? Number(selectedTag) : null,
      withoutTag: tagStatus === 'without',
      withFile: selectedCondition === 'hasFile',
      withLink: selectedCondition === 'hasLink',
      isShare: selectedCondition === 'isShare' ? true : false,
      hasTodo: selectedCondition === 'hasTodo',
      isArchived: null
    };
    lumina.noteList.resetAndCall({});
  };

  const handleReset = () => {
    setDateRange({ start: null, end: null });
    setTagStatus("all");
    setSelectedTag(null);
    setSelectedCondition(null);

    lumina.noteListFilterConfig = {
      ...lumina.noteListFilterConfig,
      startDate: null,
      endDate: null,
      tagId: null,
      withoutTag: false,
      withFile: false,
      withLink: false,
      isArchived: false,
      isShare: null,
      hasTodo: false
    };
    lumina.noteList.resetAndCall({});
  };

  return (
    <Popover placement="bottom-start" backdrop="blur">
      <PopoverTrigger>
        <Button isIconOnly size="sm" variant="light">
          <i className="ri-filter-3-line text-xl cursor-pointer"></i>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="p-4 flex flex-col gap-4 min-w-[300px]">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <i className="ri-time-line text-xl"></i>
              {t('time-range')}
            </div>
            <Popover placement="bottom" classNames={{
              content: [
                "p-0 bg-transparent border-none shadow-none",
              ],
            }}>
              <PopoverTrigger>
                <div className="flex items-center gap-2 bg-default-100 rounded-lg p-3">
                  <i className="ri-calendar-line text-lg"></i>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {dateRange.start ? dayjs(new Date(dateRange.start.toString())).format('YYYY-MM-DD') : t('start-date')}
                    </span>
                    <span className="text-default-500">{t('to')}</span>
                    <span className="text-sm">
                      {dateRange.end ? dayjs(new Date(dateRange.end.toString())).format('YYYY-MM-DD') : t('end-date')}
                    </span>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent>
                <div className="flex flex-col gap-2">
                  <RangeCalendar
                    className="bg-background"
                    value={dateRange.start && dateRange.end ? dateRange : undefined}
                    onChange={setDateRange}
                    focusedValue={focusedValue}
                    onFocusChange={setFocusedValue}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <i className="ri-price-tag-3-line text-lg"></i>
              {t('tag-status')}
            </div>
            <Select
              value={tagStatus}
              onChange={(e) => setTagStatus(e.target.value)}
              className="w-full"
              defaultSelectedKeys={['all']}
              classNames={{
                trigger: "h-12",
              }}
              labelPlacement="outside"
              placeholder={t('select-tag-status')}
              renderValue={(items) => {
                const item = items[0];
                const getIcon = (value: string) => {
                  switch (value) {
                    case 'all':
                      return <i className="ri-file-list-line text-lg"></i>;
                    case 'with':
                      return <i className="ri-price-tag-2-line text-lg"></i>;
                    case 'without':
                      return <i className="ri-price-tag-2-line text-lg"></i>;
                    default:
                      return null;
                  }
                };
                return (
                  <div className="flex items-center gap-2">
                    {getIcon(item?.key as string)}
                    <span>{item?.textValue}</span>
                  </div>
                );
              }}
            >
              {[
                { key: 'all', label: t('all'), icon: <i className="ri-file-list-line text-lg"></i> },
                { key: 'with', label: t('with-tags'), icon: <i className="ri-price-tag-2-line text-lg"></i> },
                { key: 'without', label: t('without-tags'), icon: <i className="ri-price-tag-2-line text-lg"></i> }
              ].map((item) => (
                <SelectItem key={item.key} textValue={item.label}>
                  <div className="flex gap-2 items-center">
                    {item.icon}
                    <span className="text-small">{item.label}</span>
                  </div>
                </SelectItem>
              ))}
            </Select>
          </div>

          {tagStatus === "with" && (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <i className="ri-price-tag-3-line text-lg"></i>
                {t('select-tags')}
              </div>

              <TagSelector
                selectedTag={selectedTag}
                onSelectionChange={(key) => setSelectedTag(key)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <i className="ri-list-settings-line text-lg"></i>
              {t('additional-conditions')}
            </div>
            <RadioGroup
              value={selectedCondition || ""}
              onValueChange={setSelectedCondition}
            >
              <Radio value="">{t('no-condition')}</Radio>
              {conditions.map(condition => (
                <Radio key={condition.value} value={condition.value}>
                  {condition.label}
                </Radio>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-2">
            <Button
              color="primary"
              onClick={handleApplyFilter}
              className="flex-1"
              startContent={<i className="ri-filter-3-line text-lg"></i>}
            >
              {t('apply-filter')}
            </Button>
            <Button
              variant="flat"
              onClick={handleReset}
              className="flex-1"
              startContent={<i className="ri-refresh-line text-lg"></i>}
            >
              {t('reset')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
