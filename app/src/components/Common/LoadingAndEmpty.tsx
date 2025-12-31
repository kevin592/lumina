import { useTranslation } from 'react-i18next';

interface LoadingAndEmptyProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  isAbsolute?: boolean;
}

export const LoadingAndEmpty = ({ isLoading, isEmpty, emptyMessage, className, isAbsolute = true }: LoadingAndEmptyProps) => {
  const { t } = useTranslation();

  return (
    <div className={`text-ignore flex flex-col items-center justify-center gap-1 w-full ${className}`}>
      <i
        className={`text-ignore mt-2 mb-[-5px] !transition-all ri-loader-line ${isLoading ? 'h-[30px] block' : 'h-0 hidden'}`}
      ></i>
      {isEmpty && (
        <div className={`${isAbsolute ? 'absolute top-[40%]' : ''} select-none text-ignore flex items-center justify-center gap-2 w-full mt-2 md:mt-10`}>
          <i className="ri-inbox-line text-xl"></i>
          <div className='text-md text-ignore font-bold'>
            {emptyMessage || t('no-data-here-well-then-time-to-write-a-note')}
          </div>
        </div>
      )}
    </div>
  );
}; 